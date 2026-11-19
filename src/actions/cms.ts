"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import {
  contentPageUpsertSchema,
  eventUpsertSchema,
  homepageSectionUpsertSchema,
  mediaAssetCreateSchema,
  sermonFeatureUpsertSchema,
  type ContentPageUpsertInput,
  type EventUpsertInput,
  type HomepageSectionUpsertInput,
  type MediaAssetCreateInput,
  type SermonFeatureUpsertInput,
} from "@/lib/schemas";
import { sanitizeRichTextHtml } from "@/lib/rich-text";
import { feeSettingsError } from "@/lib/schemas/cms.schema";
import { tagRegistrationAttendees } from "@/lib/event-registration";
import { storedShareMessage } from "@/lib/share-message";

class EventSaveError extends Error {}

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function getAdminEvents() {
  await requirePermission("read", "Event");
  return prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { attendees: true } } },
  });
}

export async function getAdminEventById(id: string) {
  await requirePermission("read", "Event");
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      priceTiers: { orderBy: { sortOrder: "asc" } },
      _count: { select: { registrations: true } },
    },
  });
  if (!event) return null;
  // Decimal doesn't cross to client components.
  const { priceTiers, _count, ...rest } = event;
  return {
    ...rest,
    bookingCount: _count.registrations,
    priceTiers: priceTiers.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      amount: t.amount.toNumber(),
    })),
  };
}

/** Active funds for the event fee picker. Read directly: EDITORs manage events but can't read Fund. */
export async function listFeeFunds() {
  await requirePermission("update", "Event");
  return prisma.fund.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Other events' registration forms, for "Copy form from…" in the builder. */
export async function listEventForms(excludeId?: string) {
  await requirePermission("read", "Event");
  return prisma.event.findMany({
    where: { id: { not: excludeId }, registrationEnabled: true },
    orderBy: { date: "desc" },
    take: 50,
    select: { id: true, title: true, registrationFields: true },
  });
}

export async function saveEvent(
  input: EventUpsertInput,
): Promise<{ success: true; data: { id: string } } | { success: false; error: string }> {
  const data = eventUpsertSchema.parse(input);
  await requirePermission(data.id ? "update" : "create", "Event");
  // Returned, not thrown: Next masks thrown messages in production.
  const feeError = feeSettingsError(data);
  if (feeError) return { success: false, error: feeError };
  const bodyHtml = sanitizeRichTextHtml(data.bodyHtml);

  const payload = {
    slug: data.slug,
    title: data.title,
    category: data.category,
    date: data.date,
    endDate: data.endDate ?? null,
    time: data.time,
    location: data.location,
    address: emptyToNull(data.address),
    description: data.description,
    bodyJson: data.bodyJson ?? undefined,
    bodyHtml,
    isFeatured: data.isFeatured,
    registrationUrl: emptyToNull(data.registrationUrl),
    imageUrl: emptyToNull(data.imageUrl),
    imagePublicId: emptyToNull(data.imagePublicId),
    imageAlt: emptyToNull(data.imageAlt),
    headerImageUrl: emptyToNull(data.headerImageUrl),
    headerImagePublicId: emptyToNull(data.headerImagePublicId),
    status: data.status,
    type: data.type,
    registrationEnabled: data.registrationEnabled,
    allowOnline: data.allowOnline,
    shareMessage: storedShareMessage(data.shareMessage),
    calendarReminders: [...new Set(data.calendarReminders)].sort((a, b) => b - a),
    registrationClosesAt: data.registrationClosesAt ?? null,
    registrationFields: data.registrationFields,
    paymentMode: data.paymentMode,
    feeFundId: data.paymentMode === "PAY_AT_EVENT" || data.paymentMode === "ONLINE" ? data.feeFundId : null,
  };

  let event: { id: string; slug: string };
  try {
    event = await prisma.$transaction(async (tx) => {
      const ev = data.id
        ? await tx.event.update({ where: { id: data.id }, data: payload, select: { id: true, slug: true } })
        : await tx.event.create({ data: payload, select: { id: true, slug: true } });

      // Sync tiers by id: deleting and recreating would null every booked attendee's tier.
      const tiers = data.paymentMode === "FREE" ? [] : data.priceTiers;
      const existing = await tx.eventPriceTier.findMany({
        where: { eventId: ev.id },
        select: { id: true, name: true, _count: { select: { attendees: true } } },
      });
      const keep = new Set(tiers.map((t) => t.id).filter(Boolean));
      const removed = existing.filter((t) => !keep.has(t.id));
      const inUse = removed.find((t) => t._count.attendees > 0);
      if (inUse) {
        throw new EventSaveError(
          `People have already registered under “${inUse.name}”, so it can't be removed. Change its name or price instead.`,
        );
      }
      if (removed.length) {
        await tx.eventPriceTier.deleteMany({ where: { id: { in: removed.map((t) => t.id) } } });
      }
      const existingIds = new Set(existing.map((t) => t.id));
      // Free up names first so swapping two tiers' names doesn't trip @@unique([eventId, name]).
      for (const t of tiers) {
        if (t.id && existingIds.has(t.id)) {
          await tx.eventPriceTier.update({ where: { id: t.id }, data: { name: `__renaming_${t.id}` } });
        }
      }
      for (const [i, t] of tiers.entries()) {
        const values = { name: t.name, description: emptyToNull(t.description), amount: t.amount, sortOrder: i };
        if (t.id && existingIds.has(t.id)) {
          await tx.eventPriceTier.update({ where: { id: t.id }, data: values });
        } else {
          await tx.eventPriceTier.create({ data: { ...values, eventId: ev.id } });
        }
      }

      // No longer collecting online: bookings held for payment become ordinary confirmed ones.
      if (data.paymentMode !== "ONLINE") {
        const pending = await tx.eventRegistration.findMany({
          where: { eventId: ev.id, status: "PENDING_PAYMENT" },
          select: { id: true },
        });
        if (pending.length) {
          await tx.eventRegistration.updateMany({
            where: { id: { in: pending.map((r) => r.id) } },
            data: { status: "CONFIRMED" },
          });
          await tagRegistrationAttendees(tx, pending.map((r) => r.id));
        }
      }
      return ev;
    }, { timeout: 20_000 });
  } catch (err) {
    if (err instanceof EventSaveError) return { success: false, error: err.message };
    throw err;
  }

  revalidatePath("/admin/content/events");
  revalidatePath(`/admin/content/events/${event.id}`);
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/", "layout"); // featured-event banner + homepage section
  return { success: true, data: { id: event.id } };
}

export async function deleteEvent(id: string) {
  await requirePermission("delete", "Event");
  const event = await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/content/events");
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/", "layout"); // featured-event banner + homepage section
  return { success: true, data: event };
}

export async function getAdminContentPages() {
  await requirePermission("read", "ContentPage");
  return prisma.contentPage.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getAdminContentPageById(id: string) {
  await requirePermission("read", "ContentPage");
  return prisma.contentPage.findUnique({ where: { id } });
}

export async function saveContentPage(input: ContentPageUpsertInput) {
  const data = contentPageUpsertSchema.parse(input);
  await requirePermission(data.id ? "update" : "create", "ContentPage");
  const payload = {
    slug: data.slug,
    title: data.title,
    summary: emptyToNull(data.summary),
    bodyJson: data.bodyJson ?? undefined,
    bodyHtml: sanitizeRichTextHtml(data.bodyHtml),
    seoTitle: emptyToNull(data.seoTitle),
    seoDescription: emptyToNull(data.seoDescription),
    imageUrl: emptyToNull(data.imageUrl),
    imagePublicId: emptyToNull(data.imagePublicId),
    imageAlt: emptyToNull(data.imageAlt),
    status: data.status,
  };

  const page = data.id
    ? await prisma.contentPage.update({ where: { id: data.id }, data: payload })
    : await prisma.contentPage.create({ data: payload });

  revalidatePath("/admin/content/pages");
  revalidatePath(`/${page.slug}`);
  return { success: true, data: page };
}

export async function deleteContentPage(id: string) {
  await requirePermission("delete", "ContentPage");
  const page = await prisma.contentPage.delete({ where: { id } });
  revalidatePath("/admin/content/pages");
  revalidatePath(`/${page.slug}`);
  return { success: true, data: page };
}

export async function getAdminHomepageSections() {
  await requirePermission("read", "HomepageSection");
  return prisma.homepageSection.findMany({ orderBy: { order: "asc" } });
}

export async function saveHomepageSection(input: HomepageSectionUpsertInput) {
  const data = homepageSectionUpsertSchema.parse(input);
  await requirePermission(data.id ? "update" : "create", "HomepageSection");
  const payload = {
    key: data.key,
    eyebrow: emptyToNull(data.eyebrow),
    title: data.title,
    bodyJson: data.bodyJson ?? undefined,
    bodyHtml: sanitizeRichTextHtml(data.bodyHtml),
    ctaLabel: emptyToNull(data.ctaLabel),
    ctaHref: emptyToNull(data.ctaHref),
    imageUrl: emptyToNull(data.imageUrl),
    imagePublicId: emptyToNull(data.imagePublicId),
    imageAlt: emptyToNull(data.imageAlt),
    order: data.order,
    status: data.status,
  };

  const section = data.id
    ? await prisma.homepageSection.update({
        where: { id: data.id },
        data: payload,
      })
    : await prisma.homepageSection.create({ data: payload });

  revalidatePath("/admin/content/homepage");
  revalidatePath("/");
  return { success: true, data: section };
}

export async function deleteHomepageSection(id: string) {
  await requirePermission("delete", "HomepageSection");
  const section = await prisma.homepageSection.delete({ where: { id } });
  revalidatePath("/admin/content/homepage");
  revalidatePath("/");
  return { success: true, data: section };
}

export async function getAdminSermonFeatures() {
  await requirePermission("read", "Sermon");
  return prisma.sermonFeature.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export async function saveSermonFeature(input: SermonFeatureUpsertInput) {
  const data = sermonFeatureUpsertSchema.parse(input);
  await requirePermission(data.id ? "update" : "create", "Sermon");
  const payload = {
    videoId: data.videoId,
    title: data.title,
    description: emptyToNull(data.description),
    thumbnailUrl: emptyToNull(data.thumbnailUrl),
    videoUrl: data.videoUrl,
    publishedAt: data.publishedAt ?? null,
    isFeatured: data.isFeatured,
    order: data.order,
    status: data.status,
  };

  const sermon = data.id
    ? await prisma.sermonFeature.update({ where: { id: data.id }, data: payload })
    : await prisma.sermonFeature.create({ data: payload });

  revalidatePath("/admin/content/sermons");
  revalidatePath("/messages");
  revalidatePath("/");
  return { success: true, data: sermon };
}

export async function deleteSermonFeature(id: string) {
  await requirePermission("delete", "Sermon");
  const sermon = await prisma.sermonFeature.delete({ where: { id } });
  revalidatePath("/admin/content/sermons");
  revalidatePath("/messages");
  revalidatePath("/");
  return { success: true, data: sermon };
}

export async function createMediaAsset(input: MediaAssetCreateInput) {
  await requirePermission("create", "MediaAsset");
  const data = mediaAssetCreateSchema.parse(input);
  const media = await prisma.mediaAsset.upsert({
    where: { publicId: data.publicId },
    update: {
      url: data.url,
      altText: data.altText,
      caption: emptyToNull(data.caption),
      ownerType: emptyToNull(data.ownerType),
      ownerId: emptyToNull(data.ownerId),
    },
    create: {
      url: data.url,
      publicId: data.publicId,
      altText: data.altText,
      caption: emptyToNull(data.caption),
      ownerType: emptyToNull(data.ownerType),
      ownerId: emptyToNull(data.ownerId),
    },
  });

  return { success: true, data: media };
}
