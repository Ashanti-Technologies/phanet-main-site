"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requireAdmin } from "@/lib/auth-guard";
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

function emptyToNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function getAdminEvents() {
  await requireAdmin();
  return prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { attendees: true } } },
  });
}

export async function getAdminEventById(id: string) {
  await requireAdmin();
  return prisma.event.findUnique({ where: { id } });
}

export async function saveEvent(input: EventUpsertInput) {
  await requireAdmin();
  const data = eventUpsertSchema.parse(input);
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
    status: data.status,
    type: data.type,
    registrationEnabled: data.registrationEnabled,
    registrationClosesAt: data.registrationClosesAt ?? null,
    registrationFields: data.registrationFields,
  };

  const event = data.id
    ? await prisma.event.update({ where: { id: data.id }, data: payload })
    : await prisma.event.create({ data: payload });

  revalidatePath("/admin/content/events");
  revalidatePath(`/admin/content/events/${event.id}`);
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  return { success: true, data: event };
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  const event = await prisma.event.delete({ where: { id } });
  revalidatePath("/admin/content/events");
  revalidatePath("/events");
  revalidatePath(`/events/${event.slug}`);
  return { success: true, data: event };
}

export async function getAdminContentPages() {
  await requireAdmin();
  return prisma.contentPage.findMany({ orderBy: { updatedAt: "desc" } });
}

export async function getAdminContentPageById(id: string) {
  await requireAdmin();
  return prisma.contentPage.findUnique({ where: { id } });
}

export async function saveContentPage(input: ContentPageUpsertInput) {
  await requireAdmin();
  const data = contentPageUpsertSchema.parse(input);
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
  await requireAdmin();
  const page = await prisma.contentPage.delete({ where: { id } });
  revalidatePath("/admin/content/pages");
  revalidatePath(`/${page.slug}`);
  return { success: true, data: page };
}

export async function getAdminHomepageSections() {
  await requireAdmin();
  return prisma.homepageSection.findMany({ orderBy: { order: "asc" } });
}

export async function saveHomepageSection(input: HomepageSectionUpsertInput) {
  await requireAdmin();
  const data = homepageSectionUpsertSchema.parse(input);
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
  await requireAdmin();
  const section = await prisma.homepageSection.delete({ where: { id } });
  revalidatePath("/admin/content/homepage");
  revalidatePath("/");
  return { success: true, data: section };
}

export async function getAdminSermonFeatures() {
  await requireAdmin();
  return prisma.sermonFeature.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });
}

export async function saveSermonFeature(input: SermonFeatureUpsertInput) {
  await requireAdmin();
  const data = sermonFeatureUpsertSchema.parse(input);
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
  await requireAdmin();
  const sermon = await prisma.sermonFeature.delete({ where: { id } });
  revalidatePath("/admin/content/sermons");
  revalidatePath("/messages");
  revalidatePath("/");
  return { success: true, data: sermon };
}

export async function createMediaAsset(input: MediaAssetCreateInput) {
  await requireAdmin();
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
