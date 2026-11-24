import { prisma } from "./database";
import type { MemberStatus, Prisma } from "@/app/generated/prisma/client";

/** Fields copied from the duplicate only where the kept record has nothing. */
const FILL = [
  "preferredName", "dob", "gender", "maritalStatus", "email", "phone", "whatsapp",
  "addressLine", "city", "cityId", "countryId", "regionId", "region", "country",
  "occupation", "bio", "photoUrl", "photoPublicId", "salvationDate", "baptismDate",
  "weddingAnniversary", "joinDate", "householdId",
] as const;

// Lifecycle order; INACTIVE/TRANSFERRED/DECEASED are deliberate admin choices and always win as-is.
const RANK: Partial<Record<MemberStatus, number>> = { VISITOR: 0, PENDING_APPROVAL: 1, REGULAR: 2, MEMBER: 3 };

const blank = (v: unknown) => v === null || v === undefined || v === "";

export type MergeResult = { ok: true; keptId: string; droppedName: string } | { ok: false; error: string };

/**
 * Fold member `dropId` into `keepId`: everything attached to the duplicate moves over,
 * blank fields are filled from it, then it is deleted. All or nothing.
 * Refuses when both have a sign-in account or both are on a booking for the same event.
 */
export async function mergeMembers(keepId: string, dropId: string): Promise<MergeResult> {
  if (keepId === dropId) return { ok: false, error: "That's the same record." };
  return prisma.$transaction(async (tx) => {
    const [keep, drop] = await Promise.all(
      [keepId, dropId].map((id) =>
        tx.member.findUnique({
          where: { id },
          include: {
            phanetProfile: true,
            invites: { select: { id: true } },
            eventAttendances: { select: { eventId: true, event: { select: { title: true } } } },
            eventRegistrations: { select: { eventId: true } },
          },
        }),
      ),
    );
    if (!keep || !drop) return { ok: false, error: "Member not found." };
    if (keep.userId && drop.userId)
      return { ok: false, error: "Both records have their own sign-in account, so they can't be merged." };
    const keepEvents = new Set([...keep.eventAttendances, ...keep.eventRegistrations].map((e) => e.eventId));
    const clash = drop.eventAttendances.find((e) => keepEvents.has(e.eventId))
      ?? drop.eventRegistrations.find((e) => keepEvents.has(e.eventId));
    if (clash) {
      const title = drop.eventAttendances.find((e) => e.eventId === clash.eventId)?.event.title ?? "an event";
      return { ok: false, error: `Both are booked for ${title}. Remove one booking first.` };
    }

    // Fields: fill blanks, keep the further-along status, keep both sets of notes.
    const data: Prisma.MemberUncheckedUpdateInput = {};
    for (const f of FILL) if (blank(keep[f]) && !blank(drop[f])) (data as Record<string, unknown>)[f] = drop[f];
    const [rk, rd] = [RANK[keep.status], RANK[drop.status]];
    if (rk !== undefined && rd !== undefined && rd > rk) data.status = drop.status;
    if (drop.notes?.trim() && drop.notes !== keep.notes)
      data.notes = keep.notes?.trim() ? `${keep.notes}\n\n${drop.notes}` : drop.notes;
    if (drop.userId) {
      await tx.member.update({ where: { id: drop.id }, data: { userId: null } }); // userId is unique
      data.userId = drop.userId;
    }
    if (drop.notifyByEmail === false) data.notifyByEmail = false; // respect an opt-out on either
    if (drop.notifyBySms === false) data.notifyBySms = false;

    const from = { memberId: drop.id };
    const to = { memberId: keep.id };
    // Plain moves (no uniqueness on memberId).
    await Promise.all([
      tx.visitation.updateMany({ where: from, data: to }),
      tx.followUpTask.updateMany({ where: from, data: to }),
      tx.memberNote.updateMany({ where: from, data: to }),
      tx.income.updateMany({ where: from, data: to }),
      tx.paymentIntent.updateMany({ where: from, data: to }),
      tx.recurringGift.updateMany({ where: from, data: to }),
      tx.eventAttendee.updateMany({ where: from, data: to }), // clashes refused above
      tx.eventRegistration.updateMany({ where: { registrantId: drop.id }, data: { registrantId: keep.id } }),
    ]);

    // Unique per (member, x): move what the kept record lacks; the rest goes with the duplicate.
    const units = await tx.memberUnit.findMany({ where: from });
    await tx.memberUnit.createMany({ data: units.map((u) => ({ ...u, memberId: keep.id })), skipDuplicates: true });
    const tags = await tx.memberTag.findMany({ where: from });
    await tx.memberTag.createMany({ data: tags.map((t) => ({ ...t, memberId: keep.id })), skipDuplicates: true });
    const services = (await tx.attendance.findMany({ where: to, select: { serviceId: true } })).map((a) => a.serviceId);
    await tx.attendance.updateMany({ where: { ...from, serviceId: { notIn: services } }, data: to });
    const rsvps = (await tx.eventRsvp.findMany({ where: to, select: { eventId: true } })).map((r) => r.eventId);
    await tx.eventRsvp.updateMany({ where: { ...from, eventId: { notIn: rsvps } }, data: to });
    if (!keep.invites.length) await tx.memberInvite.updateMany({ where: from, data: to });

    if (drop.phanetProfile && !keep.phanetProfile) {
      await tx.memberPhanetProfile.update({ where: { id: drop.phanetProfile.id }, data: to });
    } else if (drop.phanetProfile && keep.phanetProfile) {
      const { id: _i, memberId: _m, createdAt: _c, updatedAt: _u, ...fields } = drop.phanetProfile;
      const fill = Object.fromEntries(
        Object.entries(fields).filter(([k, v]) => !blank(v) && blank(keep.phanetProfile![k as keyof typeof fields])),
      );
      if (Object.keys(fill).length) await tx.memberPhanetProfile.update({ where: { id: keep.phanetProfile.id }, data: fill });
    }

    // Household invites: drop ones between the two, move the rest unless the pair already exists.
    await tx.householdInvite.deleteMany({
      where: { OR: [{ fromMemberId: drop.id, toMemberId: keep.id }, { fromMemberId: keep.id, toMemberId: drop.id }] },
    });
    for (const inv of await tx.householdInvite.findMany({ where: { OR: [{ fromMemberId: drop.id }, { toMemberId: drop.id }] } })) {
      const pair = {
        fromMemberId: inv.fromMemberId === drop.id ? keep.id : inv.fromMemberId,
        toMemberId: inv.toMemberId === drop.id ? keep.id : inv.toMemberId,
      };
      const exists = await tx.householdInvite.findUnique({ where: { fromMemberId_toMemberId: pair }, select: { id: true } });
      if (!exists) await tx.householdInvite.update({ where: { id: inv.id }, data: pair });
    }

    await tx.member.update({ where: { id: keep.id }, data });
    await tx.member.delete({ where: { id: drop.id } });
    return { ok: true, keptId: keep.id, droppedName: drop.fullName };
  });
}

/**
 * Other members that look like the same person: same email, same phone (last 9 digits,
 * so 024… and +23324… match), or same name. Ids only; callers load what they may show.
 */
export async function findLikelyDuplicates(memberId: string): Promise<{ id: string; reasons: string[] }[]> {
  const rows = await prisma.$queryRaw<{ id: string; email: boolean; phone: boolean; name: boolean }[]>`
    with me as (
      select lower(trim(email)) e,
             nullif(right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9), '') p,
             lower(regexp_replace(trim("fullName"), '\\s+', ' ', 'g')) n
      from member where id = ${memberId}
    )
    select m.id,
           (me.e <> '' and lower(trim(m.email)) = me.e) as email,
           (length(me.p) = 9 and right(regexp_replace(coalesce(m.phone, ''), '\\D', '', 'g'), 9) = me.p) as phone,
           (lower(regexp_replace(trim(m."fullName"), '\\s+', ' ', 'g')) = me.n) as name
    from member m, me
    where m.id <> ${memberId}
      and ((me.e <> '' and lower(trim(m.email)) = me.e)
        or (length(me.p) = 9 and right(regexp_replace(coalesce(m.phone, ''), '\\D', '', 'g'), 9) = me.p)
        or lower(regexp_replace(trim(m."fullName"), '\\s+', ' ', 'g')) = me.n)
    limit 10`;
  return rows.map((r) => ({
    id: r.id,
    reasons: [r.email && "same email", r.phone && "same phone", r.name && "same name"].filter(Boolean) as string[],
  }));
}
