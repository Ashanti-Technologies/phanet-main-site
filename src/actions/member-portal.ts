"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  eventRsvpSchema,
  memberNotificationsUpdateSchema,
  memberProfileUpdateSchema,
  type EventRsvpInput,
  type MemberNotificationsUpdateInput,
  type MemberProfileUpdateInput,
} from "@/lib/schemas/self-service.schema";

async function requireLinkedMember() {
  const session = await requirePermission("access", "MemberPortal");
  const member = await prisma.member.findUnique({
    where: { userId: session.user.id },
    select: { id: true, userId: true },
  });
  if (!member) throw new Error("No member profile is linked to this account");
  return { session, member };
}

export async function updateMyProfile(input: MemberProfileUpdateInput) {
  const data = memberProfileUpdateSchema.parse(input);
  const { session, member } = await requireLinkedMember();
  await requirePermission("update", "Member", { userId: session.user.id });

  const updated = await prisma.member.update({
    where: { id: member.id },
    data: {
      preferredName: data.preferredName,
      phone: data.phone,
      whatsapp: data.whatsapp,
      addressLine: data.addressLine,
      city: data.city,
      region: data.region,
      country: data.country ?? "Ghana",
      occupation: data.occupation,
    },
  });

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
