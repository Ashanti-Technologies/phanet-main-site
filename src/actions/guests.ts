"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requirePermission, scopeOf } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { log } from "@/lib/logger";
import { track } from "@/lib/posthog-server";
import { upcomingElimHours } from "@/lib/events";
import { findMemberByContact } from "@/lib/event-registration";
import { resolveMemberLocation } from "@/lib/member-location";
import {
  assignGuestSchema,
  HEARD_FROM_LABELS,
  planFirstVisitSchema,
  routeGuestSchema,
  type PlanFirstVisitInput,
} from "@/lib/schemas/guest.schema";

type PlanResult = { ok: true; plannedFor: string; firstName: string } | { ok: false; error: string };

/** How many upcoming Sundays the /new-here form offers. */
const SUNDAYS_OFFERED = 4;

/** Public: "Plan your first Sunday" on /new-here. */
export async function planFirstVisit(input: PlanFirstVisitInput): Promise<PlanResult> {
  const parsed = planFirstVisitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  const firstName = d.fullName.split(/\s+/)[0];

  // Bots fill the hidden field; tell them it worked and store nothing.
  if (d.website) return { ok: true, plannedFor: d.plannedFor, firstName };

  const plannedFor = new Date(d.plannedFor);
  if (!upcomingElimHours(SUNDAYS_OFFERED).some((s) => s.getTime() === plannedFor.getTime())) {
    return { ok: false, error: "That Sunday has passed. Please pick another." };
  }

  const unit = d.unitId
    ? await prisma.churchUnitOption.findFirst({
        where: { id: d.unitId, kind: "CHAPTER", isActive: true },
        select: { id: true, name: true },
      })
    : null;
  if (d.unitId && !unit) return { ok: false, error: "Please pick a chapter from the list." };

  const email = d.email || null;
  const phone = d.phone?.trim() || null;

  try {
    // Match an existing record by contact, never by name. Their details are
    // never overwritten from this public form.
    const match = (email && (await findMemberByContact(email))) || (phone && (await findMemberByContact(phone))) || null;
    const existing = match
      ? await prisma.member.findUnique({ where: { id: match.id }, select: { id: true, status: true } })
      : null;

    const guest = await prisma.$transaction(async (tx) => {
      let memberId: string;
      if (existing) {
        memberId = existing.id;
        // Still a visitor: put them in the chapter so its team can see them.
        if (unit && existing.status === "VISITOR") {
          await tx.memberUnit.createMany({ data: [{ memberId, unitId: unit.id }], skipDuplicates: true });
        }
      } else {
        const location = d.location ? await resolveMemberLocation(d.location) : {};
        const member = await tx.member.create({
          data: {
            fullName: d.fullName,
            email,
            phone,
            whatsapp: phone,
            ...location,
            status: "VISITOR",
            ...(unit && { units: { create: { unitId: unit.id } } }),
          },
          select: { id: true },
        });
        memberId = member.id;
      }

      // A double submit for the same Sunday is one sign-up.
      const dupe = await tx.guest.findFirst({ where: { memberId, plannedFor }, select: { id: true } });
      if (dupe) return dupe;
      return tx.guest.create({
        data: {
          memberId,
          unitId: unit?.id ?? null,
          heardFrom: d.heardFrom,
          heardFromOther: d.heardFrom === "OTHER" ? d.heardFromOther || null : null,
          plannedFor,
        },
        select: { id: true },
      });
    });

    if (d.prayerRequest) {
      await prisma.prayerRequest.create({
        data: { content: d.prayerRequest.slice(0, 2000), name: d.fullName, email, phone },
      });
    }

    track("guest_planned_visit", null, {
      heard_from: d.heardFrom,
      chapter: unit?.name ?? "National",
      existing_member: !!existing,
      has_prayer_request: !!d.prayerRequest,
      has_email: !!email,
      has_phone: !!phone,
    });
    log.info("guests", "first visit planned", { guestId: guest.id, chapter: unit?.name ?? "national" });
    revalidatePath("/admin/guests");
    return { ok: true, plannedFor: d.plannedFor, firstName };
  } catch (err) {
    log.error("guests", "plan first visit failed", { err });
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** The upcoming Elim Hours a guest can choose from, plus active chapters. */
export async function getFirstVisitOptions() {
  const chapters = await prisma.churchUnitOption.findMany({
    where: { kind: "CHAPTER", isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  return { sundays: upcomingElimHours(SUNDAYS_OFFERED).map((s) => s.toISOString()), chapters };
}

// ---------------------------------------------------------------------------
// Admin

export type GuestFilter = "new" | "active" | "done" | "all";

/** Unit-limited teams see their chapters' guests; national guests (no unit) need org-wide access. */
async function guestScope(action: "read" | "update"): Promise<Prisma.GuestWhereInput> {
  const scope = await scopeOf(action, "Guest");
  return scope === "all" ? {} : { unitId: { in: scope } };
}

const STATUS_WHERE: Record<GuestFilter, Prisma.GuestWhereInput> = {
  new: { followUpTaskId: null },
  active: { followUpTask: { status: "OPEN" } },
  done: { followUpTask: { status: { in: ["DONE", "CANCELLED"] } } },
  all: {},
};

export async function getGuests({ filter = "new", unit }: { filter?: GuestFilter; unit?: string }) {
  await requirePermission("read", "Guest");
  const scoped = await guestScope("read");
  const contactScope = await scopeOf("read", "MemberContact");

  const where: Prisma.GuestWhereInput = {
    AND: [
      scoped,
      STATUS_WHERE[filter],
      unit === "national" ? { unitId: null } : unit ? { unitId: unit } : {},
    ],
  };
  const since = new Date(Date.now() - 90 * 86_400_000);

  const [rows, total, waiting, welcomed, stayed] = await Promise.all([
    prisma.guest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // ponytail: newest 200; add paging when a chapter's queue outgrows it.
      take: 200,
      select: {
        id: true,
        heardFrom: true,
        heardFromOther: true,
        plannedFor: true,
        remindedAt: true,
        createdAt: true,
        unit: { select: { id: true, name: true } },
        followUpTask: { select: { status: true, assignedTo: { select: { name: true } } } },
        member: {
          select: {
            id: true,
            fullName: true,
            status: true,
            email: true,
            phone: true,
            whatsapp: true,
            city: true,
            country: true,
            units: { select: { unitId: true } },
          },
        },
      },
    }),
    prisma.guest.count({ where: { AND: [scoped, { createdAt: { gte: since } }] } }),
    prisma.guest.count({ where: { AND: [scoped, { followUpTaskId: null }] } }),
    prisma.guest.count({ where: { AND: [scoped, { createdAt: { gte: since } }, { followUpTask: { status: "DONE" } }] } }),
    prisma.guest.count({
      where: { AND: [scoped, { createdAt: { gte: since } }, { member: { status: { in: ["REGULAR", "MEMBER"] } } }] },
    }),
  ]);

  const guests = rows.map(({ member, ...g }) => {
    const unitIds = [g.unit?.id, ...member.units.map((u) => u.unitId)].filter((id): id is string => !!id);
    const contactVisible = contactScope === "all" || unitIds.some((id) => contactScope.includes(id));
    return {
      ...g,
      heardFromLabel: g.heardFrom === "OTHER" && g.heardFromOther ? g.heardFromOther : HEARD_FROM_LABELS[g.heardFrom],
      member: {
        id: member.id,
        fullName: member.fullName,
        status: member.status,
        place: [member.city, member.country].filter(Boolean).join(", "),
        email: contactVisible ? member.email : null,
        phone: contactVisible ? member.phone : null,
        whatsapp: contactVisible ? member.whatsapp : null,
        contactHidden: !contactVisible,
      },
    };
  });

  return { guests, stats: { total, waiting, welcomed, stayed } };
}

export async function getGuestChapters() {
  await requirePermission("read", "Guest");
  return prisma.churchUnitOption.findMany({
    where: { kind: "CHAPTER" },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

async function loadGuest(guestId: string) {
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    select: {
      id: true,
      unitId: true,
      plannedFor: true,
      followUpTaskId: true,
      heardFrom: true,
      heardFromOther: true,
      unit: { select: { name: true } },
      member: { select: { id: true, fullName: true, status: true } },
    },
  });
  if (!guest) throw new Error("Guest not found");
  return guest;
}

const unitInstance = (unitId: string | null) => ({ unitIds: unitId ? [unitId] : [] });

/** Hand a guest to someone (default: me) as a follow-up task. */
export async function assignGuest(input: { guestId: string; assignedToId?: string }) {
  const data = assignGuestSchema.parse(input);
  const guest = await loadGuest(data.guestId);
  const session = await requirePermission("update", "Guest", unitInstance(guest.unitId));
  if (guest.followUpTaskId) throw new Error("Someone is already following up with this guest");

  const assignedToId = data.assignedToId ?? session.user.id;
  if (assignedToId !== session.user.id) {
    const ok = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        banned: { not: true },
        adminAccess: { some: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } },
      },
      select: { id: true },
    });
    if (!ok) throw new Error("That person can't be given tasks");
  }

  const sunday = guest.plannedFor.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const heard = guest.heardFrom === "OTHER" && guest.heardFromOther ? guest.heardFromOther : HEARD_FROM_LABELS[guest.heardFrom];

  const task = await prisma.$transaction(async (tx) => {
    const task = await tx.followUpTask.create({
      data: {
        memberId: guest.member.id,
        assignedToId,
        createdById: session.user.id,
        title: `Welcome ${guest.member.fullName} (new guest)`,
        notes: `Planned to join Elim Hour on ${sunday}. Heard about PHANET from: ${heard}. Chapter: ${guest.unit?.name ?? "not sure (national)"}.`,
        dueAt: new Date(guest.plannedFor.getTime() + 2 * 86_400_000),
      },
      select: { id: true },
    });
    // Only one person picks up a guest, even if two click at once.
    const { count } = await tx.guest.updateMany({
      where: { id: guest.id, followUpTaskId: null },
      data: { followUpTaskId: task.id },
    });
    if (count === 0) throw new Error("Someone is already following up with this guest");
    return task;
  });

  await logAudit({
    action: "guest.assign",
    subject: "Guest",
    subjectId: guest.id,
    actorId: session.user.id,
    meta: { taskId: task.id, assignedToId },
  });
  revalidatePath("/admin/guests");
  revalidatePath("/admin/tasks");
  return { success: true };
}

/** Move a guest to another chapter, or back to the national team (null). */
export async function routeGuest(input: { guestId: string; unitId: string | null }) {
  const data = routeGuestSchema.parse(input);
  const guest = await loadGuest(data.guestId);
  const session = await requirePermission("update", "Guest", unitInstance(guest.unitId));
  // Any team may hand a guest back to national; sending to a chapter needs access there.
  if (data.unitId) {
    await requirePermission("update", "Guest", unitInstance(data.unitId));
    const chapter = await prisma.churchUnitOption.findFirst({
      where: { id: data.unitId, kind: "CHAPTER" },
      select: { id: true },
    });
    if (!chapter) throw new Error("Pick a chapter");
  }
  if (data.unitId === guest.unitId) return { success: true };

  await prisma.$transaction(async (tx) => {
    await tx.guest.update({ where: { id: guest.id }, data: { unitId: data.unitId } });
    // Visitors live in their guest chapter; keep that in step.
    if (guest.member.status === "VISITOR") {
      if (guest.unitId) {
        await tx.memberUnit.deleteMany({ where: { memberId: guest.member.id, unitId: guest.unitId } });
      }
      if (data.unitId) {
        await tx.memberUnit.createMany({
          data: [{ memberId: guest.member.id, unitId: data.unitId }],
          skipDuplicates: true,
        });
      }
    }
  });

  await logAudit({
    action: "guest.route",
    subject: "Guest",
    subjectId: guest.id,
    actorId: session.user.id,
    meta: { from: guest.unitId, to: data.unitId },
  });
  revalidatePath("/admin/guests");
  return { success: true };
}
