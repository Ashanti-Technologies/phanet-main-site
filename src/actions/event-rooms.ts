"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  roomInputSchema,
  roomTypeInputSchema,
  roomsCreateSchema,
} from "@/lib/schemas/event-registration.schema";

type Result = { success: true } | { success: false; error: string };
const fail = (error: string): Result => ({ success: false, error });
const ok: Result = { success: true };

function refresh(eventId: string) {
  revalidatePath(`/admin/content/events/${eventId}/rooms`);
  revalidatePath(`/admin/content/events/${eventId}/registrations`);
}

function friendly(err: unknown): Result {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return fail("That name is already used.");
  }
  throw err;
}

// Room setup and allocation both touch people's records → same gate as check-in.
const guard = () => requirePermission("update", "Member");

export async function createRoomType(eventId: string, input: unknown): Promise<Result> {
  await guard();
  const parsed = roomTypeInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { type: true } });
  if (event?.type !== "CAMP") return fail("Rooms are only for camp events.");
  try {
    await prisma.eventRoomType.create({ data: { eventId, ...parsed.data } });
  } catch (err) {
    return friendly(err);
  }
  refresh(eventId);
  return ok;
}

export async function deleteRoomType(roomTypeId: string): Promise<Result> {
  await guard();
  // FK: rooms cascade, attendees' roomId is set to null (they become unassigned).
  const rt = await prisma.eventRoomType.delete({ where: { id: roomTypeId } });
  refresh(rt.eventId);
  return ok;
}

export async function createRooms(roomTypeId: string, input: unknown): Promise<Result> {
  await guard();
  const parsed = roomsCreateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, beds, gender, quantity } = parsed.data;
  const rt = await prisma.eventRoomType.findUnique({ where: { id: roomTypeId }, select: { eventId: true } });
  if (!rt) return fail("Room type not found.");
  const names = quantity === 1 ? [name] : Array.from({ length: quantity }, (_, i) => `${name} ${i + 1}`);
  try {
    // createMany is all-or-nothing on a duplicate name, which is what we want.
    await prisma.eventRoom.createMany({
      data: names.map((n) => ({ roomTypeId, name: n, beds, gender })),
    });
  } catch (err) {
    return friendly(err);
  }
  refresh(rt.eventId);
  return ok;
}

export async function updateRoom(roomId: string, input: unknown): Promise<Result> {
  await guard();
  const parsed = roomInputSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const room = await prisma.eventRoom.findUnique({
    where: { id: roomId },
    select: { roomType: { select: { eventId: true } }, _count: { select: { attendees: true } } },
  });
  if (!room) return fail("Room not found.");
  if (parsed.data.beds < room._count.attendees) {
    return fail(`${room._count.attendees} people are already in this room — move some out first.`);
  }
  try {
    await prisma.eventRoom.update({ where: { id: roomId }, data: parsed.data });
  } catch (err) {
    return friendly(err);
  }
  refresh(room.roomType.eventId);
  return ok;
}

export async function deleteRoom(roomId: string): Promise<Result> {
  await guard();
  const room = await prisma.eventRoom.delete({
    where: { id: roomId },
    select: { roomType: { select: { eventId: true } } },
  });
  refresh(room.roomType.eventId);
  return ok;
}

/**
 * Put people in a room (or take them out with roomId = null). Fails if the
 * room would go over its bed count. The room row is locked for the duration,
 * so two admins can't both fill the last bed.
 */
export async function assignRoom(attendeeIds: string[], roomId: string | null): Promise<Result> {
  const session = await guard();
  const ids = [...new Set(attendeeIds.map(String))].slice(0, 100);
  if (!ids.length) return fail("No one selected.");

  const attendees = await prisma.eventAttendee.findMany({
    where: { id: { in: ids } },
    select: { id: true, eventId: true },
  });
  if (attendees.length !== ids.length) return fail("Someone on this list no longer exists.");
  const eventId = attendees[0].eventId;
  if (attendees.some((a) => a.eventId !== eventId)) return fail("Mixed events.");

  if (roomId === null) {
    await prisma.eventAttendee.updateMany({ where: { id: { in: ids } }, data: { roomId: null } });
  } else {
    const result = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ beds: number; eventId: string }[]>`
        SELECT r.beds, t."eventId" FROM event_room r
        JOIN event_room_type t ON t.id = r."roomTypeId"
        WHERE r.id = ${roomId}
        FOR UPDATE OF r`;
      const room = locked[0];
      if (!room || room.eventId !== eventId) return fail("Room not found for this event.");
      const others = await tx.eventAttendee.count({
        where: { roomId, id: { notIn: ids } },
      });
      if (others + ids.length > room.beds) {
        const free = Math.max(room.beds - others, 0);
        return fail(`Not enough beds: ${free} free, ${ids.length} needed.`);
      }
      await tx.eventAttendee.updateMany({ where: { id: { in: ids } }, data: { roomId } });
      return ok;
    });
    if (!result.success) return result;
  }

  await logAudit({
    action: roomId ? "event_attendee.assign_room" : "event_attendee.unassign_room",
    subject: "EventAttendee",
    subjectId: ids.join(","),
    actorId: session.user.id,
    meta: { roomId, count: ids.length },
  });
  refresh(eventId);
  return ok;
}
