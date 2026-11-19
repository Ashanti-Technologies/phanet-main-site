import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import type { Answers } from "@/lib/schemas/event-registration.schema";

/** Attendees who need a bed. Infants share with a parent; unknown age counts. */
export const takesBed = {
  OR: [{ ageGroup: null }, { ageGroup: { not: "INFANT" } }],
} satisfies Prisma.EventAttendeeWhereInput;

/**
 * People a member may add to a booking by id: their household plus anyone
 * they've booked before. Guests have no household, so without the second
 * part they'd be re-created as new people every event.
 */
export async function getKnownPeople(member: { id: string; householdId: string | null }) {
  const [household, past] = await Promise.all([
    member.householdId
      ? prisma.member.findMany({
          where: { householdId: member.householdId, id: { not: member.id } },
          select: { id: true, fullName: true },
        })
      : [],
    prisma.eventAttendee.findMany({
      where: { registration: { registrantId: member.id }, memberId: { not: member.id } },
      orderBy: { createdAt: "desc" },
      distinct: ["memberId"],
      select: { relationship: true, member: { select: { id: true, fullName: true } } },
    }),
  ]);
  const people = new Map<string, { id: string; fullName: string; relationship: "SPOUSE" | "CHILD" | "GUEST" }>();
  for (const h of household) people.set(h.id, { ...h, relationship: "CHILD" });
  for (const p of past) {
    // SELF can't occur (memberId ≠ registrant), but keep the type honest
    const relationship = p.relationship === "SELF" ? "GUEST" : p.relationship;
    people.set(p.member.id, { ...p.member, relationship });
  }
  return [...people.values()].sort((a, b) => a.fullName.localeCompare(b.fullName));
}

/** Open = switched on, published, and before the closing time (or event start). */
export function isRegistrationOpen(event: {
  status: string;
  registrationEnabled: boolean;
  registrationClosesAt: Date | null;
  date: Date;
}) {
  if (!event.registrationEnabled || event.status !== "PUBLISHED") return false;
  return Date.now() < (event.registrationClosesAt ?? event.date).getTime();
}

/**
 * Find one person by exact email, or by phone (last 9 digits, so
 * 0244 123 456 and +233 24 412 3456 match). Never a name search: members
 * must not be able to browse other people's details.
 */
export async function findMemberByContact(contact: string) {
  const c = contact.trim();
  if (c.includes("@")) {
    return prisma.member.findFirst({
      where: { email: { equals: c, mode: "insensitive" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, fullName: true },
    });
  }
  const digits = c.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const rows = await prisma.$queryRaw<{ id: string; fullName: string }[]>`
    SELECT id, "fullName" FROM member
    WHERE phone IS NOT NULL
      AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 9) = ${digits.slice(-9)}
    ORDER BY "createdAt" ASC
    LIMIT 1`;
  return rows[0] ?? null;
}

/** "Kwame Asante Mensah" → "Kwame M." — enough to confirm, not to harvest. */
export function maskName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

const AGE_LABELS: Record<string, string> = {
  ADULT: "Adult",
  TEEN: "Teen",
  CHILD: "Child",
  INFANT: "Infant",
};
const REL_LABELS: Record<string, string> = {
  SELF: "Registrant",
  SPOUSE: "Spouse",
  CHILD: "Child",
  GUEST: "Guest",
};

/** Flat, one-row-per-person view of an event's registrations (admin). */
export async function getEventAttendeeRows(eventId: string) {
  const attendees = await prisma.eventAttendee.findMany({
    where: { eventId, registration: { status: "CONFIRMED" } },
    orderBy: [{ registration: { createdAt: "asc" } }, { createdAt: "asc" }],
    include: {
      member: { select: { fullName: true, phone: true, email: true, gender: true, status: true } },
      room: { select: { name: true, roomType: { select: { name: true } } } },
      registration: {
        include: { registrant: { select: { fullName: true, phone: true, email: true } } },
      },
    },
  });

  return attendees.map((a) => {
    const r = a.registration;
    return {
      id: a.id,
      registrationId: r.id,
      name: a.member.fullName,
      phone: a.member.phone ?? "",
      email: a.member.email ?? "",
      gender: a.member.gender ?? "",
      memberStatus: a.member.status,
      relationship: REL_LABELS[a.relationship] ?? a.relationship,
      bookedBy: r.registrant.fullName,
      bookedByContact: r.registrant.phone || r.registrant.email || "",
      ageGroup: a.ageGroup ? AGE_LABELS[a.ageGroup] : "",
      room: a.room ? `${a.room.roomType.name} · ${a.room.name}` : "",
      checkedIn: !!a.checkedInAt,
      registeredAt: r.createdAt,
      personAnswers: (a.answers ?? {}) as Answers,
      bookingAnswers: (r.answers ?? {}) as Answers,
    };
  });
}

export type AttendeeRow = Awaited<ReturnType<typeof getEventAttendeeRows>>[number];

/** Count rows by a key, most common first. Empty keys become `emptyLabel`. */
export function tally(rows: AttendeeRow[], key: (r: AttendeeRow) => string, emptyLabel = "Not given") {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = key(r) || emptyLabel;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Rooms (grouped by type, with usage) and bookings for room allocation. */
export async function getEventRooms(eventId: string) {
  const [roomTypes, registrations] = await Promise.all([
    prisma.eventRoomType.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: {
        rooms: { include: { _count: { select: { attendees: { where: takesBed } } } } },
      },
    }),
    prisma.eventRegistration.findMany({
      where: { eventId, status: "CONFIRMED" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        registrant: { select: { fullName: true } },
        attendees: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            relationship: true,
            ageGroup: true,
            roomId: true,
            member: { select: { fullName: true, gender: true } },
          },
        },
      },
    }),
  ]);

  const rooms = roomTypes.flatMap((t) =>
    t.rooms
      // natural sort so "Room 2" comes before "Room 10"
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((r) => ({
        id: r.id,
        name: r.name,
        typeId: t.id,
        typeName: t.name,
        beds: r.beds,
        gender: r.gender,
        used: r._count.attendees,
      })),
  );

  return {
    rooms,
    roomTypes: roomTypes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      rooms: rooms.filter((r) => r.typeId === t.id),
    })),
    bookings: registrations.map((r) => ({
      id: r.id,
      registrant: r.registrant.fullName,
      attendees: r.attendees.map((a) => ({
        id: a.id,
        name: a.member.fullName,
        gender: a.member.gender,
        ageGroup: a.ageGroup,
        relationship: a.relationship,
        roomId: a.roomId,
      })),
    })),
  };
}

export type EventRooms = Awaited<ReturnType<typeof getEventRooms>>;
