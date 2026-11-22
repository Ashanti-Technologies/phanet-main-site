"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { getCurrentMemberForPortal } from "@/lib/member-portal";
import { resolveMemberLocation } from "@/lib/member-location";
import {
  eventRsvpSchema,
  householdInviteResponseSchema,
  memberNotificationsUpdateSchema,
  memberProfileUpdateSchema,
  type EventRsvpInput,
  type MemberNotificationsUpdateInput,
  type MemberProfileUpdateInput,
} from "@/lib/schemas/self-service.schema";

async function requireLinkedMember() {
  const { session, member } = await getCurrentMemberForPortal();
  if (!member) {
    throw new Error("No member profile is linked to this account");
  }
  return { session, member };
}

async function applyProfileUpdate(
  memberId: string,
  data: ReturnType<typeof memberProfileUpdateSchema.parse>,
  options: { confirm?: boolean } = {},
) {
  const location = await resolveMemberLocation(data);

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: memberId },
      data: {
        preferredName: data.preferredName,
        occupation: data.occupation,
        bio: data.bio,
        dob: data.dob,
        gender: data.gender ?? null,
        maritalStatus: data.maritalStatus ?? null,
        phone: data.phone,
        whatsapp: data.whatsapp,
        addressLine: data.addressLine,
        ...location,
      },
    });

    const phanetData = {
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      lifeStage: data.lifeStage ?? null,
      regionalChapter: data.regionalChapter ?? null,
      professionalTrack: data.professionalTrack ?? null,
      organizationName: data.organizationName,
    };
    await tx.memberPhanetProfile.upsert({
      where: { memberId },
      create: {
        memberId,
        ...phanetData,
        ...(options.confirm ? { formSubmittedAt: new Date() } : {}),
      },
      update: {
        ...phanetData,
        ...(options.confirm ? { formSubmittedAt: new Date() } : {}),
      },
    });

    return member;
  });
}

export async function updateMyProfile(input: MemberProfileUpdateInput) {
  const data = memberProfileUpdateSchema.parse(input);
  const { session, member } = await requireLinkedMember();
  await requirePermission("update", "Member", { userId: session.user.id });

  const updated = await applyProfileUpdate(member.id, data);

  await logAudit({
    action: "member_portal.profile_update",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
  });

  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { success: true, data: updated };
}

export async function confirmMyProfile(input: MemberProfileUpdateInput) {
  const data = memberProfileUpdateSchema.parse(input);
  const { session, member } = await requireLinkedMember();
  await requirePermission("update", "Member", { userId: session.user.id });

  const updated = await applyProfileUpdate(member.id, data, { confirm: true });

  await logAudit({
    action: "member_portal.profile_confirm",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
  });

  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { success: true, data: updated };
}

export async function updateMyPhoto(input: {
  photoUrl: string | null;
  photoPublicId: string | null;
}) {
  const { session, member } = await requireLinkedMember();
  await requirePermission("update", "Member", { userId: session.user.id });

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: {
      photoUrl: input.photoUrl,
      photoPublicId: input.photoPublicId,
    },
    select: { id: true, photoUrl: true, photoPublicId: true },
  });

  await logAudit({
    action: "member_portal.photo_update",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
  });

  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { success: true, data: updated };
}

export async function updateMyNotifications(
  input: MemberNotificationsUpdateInput,
) {
  const data = memberNotificationsUpdateSchema.parse(input);
  const { session, member } = await requireLinkedMember();
  await requirePermission("update", "Member", { userId: session.user.id });

  const updated = await prisma.member.update({
    where: { id: member.id },
    data,
  });

  await logAudit({
    action: "member_portal.notifications_update",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
  });

  revalidatePath("/me/notifications");
  return { success: true, data: updated };
}

export async function setMyEventRsvp(input: EventRsvpInput) {
  const data = eventRsvpSchema.parse(input);
  const { session, member } = await requireLinkedMember();
  await requirePermission("access", "MemberPortal");

  const event = await prisma.event.findFirst({
    where: { id: data.eventId, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!event) throw new Error("Event not found");

  const rsvp = await prisma.eventRsvp.upsert({
    where: { memberId_eventId: { memberId: member.id, eventId: event.id } },
    create: {
      memberId: member.id,
      eventId: event.id,
      status: data.status,
    },
    update: { status: data.status },
  });

  await logAudit({
    action: "event_rsvp.update",
    subject: "Event",
    subjectId: event.id,
    actorId: session.user.id,
    meta: { memberId: member.id, status: data.status },
  });

  revalidatePath("/me");
  revalidatePath("/me/events");
  return { success: true, data: rsvp };
}

/**
 * Answer a household invite sent to me. Accepting puts both of us in the
 * inviter's household (or mine if they have none, or a new one). Only I can
 * move myself, so an existing household of mine is left if I accept.
 */
export async function respondToHouseholdInvite(input: { inviteId: string; accept: boolean }) {
  const { inviteId, accept } = householdInviteResponseSchema.parse(input);
  const { session, member } = await requireLinkedMember();
  await requirePermission("access", "MemberPortal");

  const invite = await prisma.householdInvite.findFirst({
    where: { id: inviteId, toMemberId: member.id, acceptedAt: null, declinedAt: null },
    select: { id: true, from: { select: { id: true, fullName: true, householdId: true } } },
  });
  if (!invite) throw new Error("This invitation is no longer open.");

  await prisma.$transaction(async (tx) => {
    if (!accept) {
      await tx.householdInvite.update({ where: { id: invite.id }, data: { declinedAt: new Date() } });
      return;
    }
    const householdId =
      invite.from.householdId ??
      member.householdId ??
      (await tx.household.create({ data: { name: `${invite.from.fullName} household` } })).id;
    await tx.member.updateMany({
      where: { id: { in: [invite.from.id, member.id] } },
      data: { householdId },
    });
    await tx.householdInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
  });

  await logAudit({
    action: accept ? "household_invite.accept" : "household_invite.decline",
    subject: "Member",
    subjectId: member.id,
    actorId: session.user.id,
    meta: { inviteId: invite.id, fromMemberId: invite.from.id },
  });
  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { success: true };
}
