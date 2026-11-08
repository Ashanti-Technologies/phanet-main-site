import type { EventRooms } from "@/lib/event-registration";
import { RoomSetup } from "./room-setup";
import { RoomAllocation } from "./room-allocation";

export function RoomsPanel({ eventId, data }: { eventId: string; data: EventRooms }) {
  const beds = data.rooms.reduce((n, r) => n + r.beds, 0);
  const people = data.bookings.flatMap((b) => b.attendees);
  const unassigned = people.filter((a) => !a.roomId).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {beds} beds for {people.length} people · {unassigned} still need a room
      </p>
      <RoomSetup eventId={eventId} roomTypes={data.roomTypes} />
      <RoomAllocation rooms={data.rooms} bookings={data.bookings} />
    </div>
  );
}
