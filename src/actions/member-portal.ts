"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { getCurrentMemberForPortal } from "@/lib/member-portal";
import {
  eventRsvpSchema,
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
  // Resolve text fallbacks for country/region from the FK selection so both
  // representations stay in sync (admin views still read the text columns).
  let countryName: string | null | undefined = data.country;
  let regionName: string | null | undefined = data.region;
  if (data.countryId) {
    const c = await prisma.country.findUnique({
      where: { id: data.countryId },
      select: { name: true },
    });
    if (c) countryName = c.name;
  }
  if (data.regionId) {
    const r = await prisma.region.findUnique({
      where: { id: data.regionId },
      select: { name: true },
    });
    if (r) regionName = r.name;
  }

  return prisma.$transaction(async (tx) => {
    const member = await tx.member.update({
      where: { id: memberId },
      data: {
        preferredName: data.preferredName,
        occupation: data.occupation,
        dob: data.dob,
        gender: data.gender ?? null,
        maritalStatus: data.maritalStatus ?? null,
        phone: data.phone,
        whatsapp: data.whatsapp,
        addressLine: data.addressLine,
        city: data.city,
        countryId: data.countryId,
        regionId: data.regionId,
        country: countryName ?? "Ghana",
        region: regionName,
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
  await requirePermission("read", "Event");

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
