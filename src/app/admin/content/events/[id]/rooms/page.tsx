import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/database";
import { Button } from "@/app/components/ui/button";
import { RoomSetup } from "./_components/room-setup";
import { RoomAllocation } from "./_components/room-allocation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EventRoomsPage({ params }: Props) {
  await requirePermission("read", "Member");
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, type: true },
  });
  if (!event) notFound();

  const [roomTypes, registrations] = await Promise.all([
    prisma.eventRoomType.findMany({
      where: { eventId: id },
      orderBy: { createdAt: "asc" },
      include: {
        rooms: {
          orderBy: { name: "asc" },
          include: { _count: { select: { attendees: true } } },
        },
      },
    }),
    prisma.eventRegistration.findMany({
      where: { eventId: id, status: "CONFIRMED" },
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
  const totalBeds = rooms.reduce((n, r) => n + r.beds, 0);
  const people = registrations.flatMap((r) => r.attendees);
  const unassigned = people.filter((a) => !a.roomId).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/admin/content/events/${event.id}`} aria-label="Back to event">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rooms</h1>
          <p className="text-muted-foreground">
            {event.title} · {totalBeds} beds for {people.length} people ·{" "}
            {unassigned} still need a room
          </p>
        </div>
      </div>

      {event.type !== "CAMP" ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">
          Rooms are only available for camp events. Change the event type to
          Camp to set them up.
        </p>
      ) : (
        <>
          <RoomSetup
            eventId={event.id}
            roomTypes={roomTypes.map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              rooms: rooms.filter((r) => r.typeId === t.id),
            }))}
          />
          <RoomAllocation
            rooms={rooms}
            bookings={registrations.map((r) => ({
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
            }))}
          />
        </>
      )}
    </div>
  );
}
