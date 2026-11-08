"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { assignRoom } from "@/actions/event-rooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { GENDER_LABEL, type RoomOption } from "./room-setup";

type Attendee = {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE" | null;
  ageGroup: string | null;
  relationship: string;
  roomId: string | null;
};
type Booking = { id: string; registrant: string; attendees: Attendee[] };

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

const AGE = { ADULT: "Adult", TEEN: "Teen", CHILD: "Child", INFANT: "Infant" } as Record<string, string>;
const REL = { SELF: "Booked", SPOUSE: "Spouse", CHILD: "Child", GUEST: "Guest" } as Record<string, string>;

export function RoomAllocation({ rooms, bookings }: { rooms: RoomOption[]; bookings: Booking[] }) {
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const shown = onlyUnassigned
    ? bookings.filter((b) => b.attendees.some((a) => !a.roomId))
    : bookings;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Allocate rooms</CardTitle>
          <p className="text-sm text-muted-foreground">
            Families stay together on one booking. Full rooms can&apos;t be picked.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={onlyUnassigned} onCheckedChange={(v) => setOnlyUnassigned(v === true)} />
          Only bookings that still need rooms
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add some rooms above first.</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {bookings.length ? "Everyone has a room." : "No one has registered yet."}
          </p>
        ) : (
          shown.map((b) => <BookingBlock key={b.id} booking={b} rooms={rooms} />)
        )}
      </CardContent>
    </Card>
  );
}

function BookingBlock({ booking, rooms }: { booking: Booking; rooms: RoomOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const assign = (ids: string[], roomId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await assignRoom(ids, roomId || null);
      if (!res.success) setError(res.error);
    });
  };
  const allIds = booking.attendees.map((a) => a.id);

  return (
    <section className="space-y-2 rounded-md border p-3" aria-busy={isPending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {booking.registrant}
          <span className="font-normal text-muted-foreground">
            {" "}· {booking.attendees.length} {booking.attendees.length === 1 ? "person" : "people"}
          </span>
          {isPending && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />}
        </p>
        {booking.attendees.length > 1 && (
          <div className="w-64">
            <select
              aria-label={`Put everyone booked by ${booking.registrant} in`}
              className={selectClass}
              value=""
              disabled={isPending}
              onChange={(e) => e.target.value && assign(allIds, e.target.value)}
            >
              <option value="">Put everyone in…</option>
              <RoomOptions rooms={rooms} incoming={booking.attendees} />
            </select>
          </div>
        )}
      </div>

      <ul className="divide-y">
        {booking.attendees.map((a) => (
          <li key={a.id} className="grid items-center gap-2 py-2 sm:grid-cols-[1fr_16rem]">
            <div className="text-sm">
              <span className="font-medium">{a.name}</span>
              <span className="text-muted-foreground">
                {" "}· {[REL[a.relationship], a.ageGroup && AGE[a.ageGroup], a.gender === "MALE" ? "M" : a.gender === "FEMALE" ? "F" : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            <select
              aria-label={`Room for ${a.name}`}
              className={selectClass}
              value={a.roomId ?? ""}
              disabled={isPending}
              onChange={(e) => assign([a.id], e.target.value)}
            >
              <option value="">Unassigned</option>
              <RoomOptions rooms={rooms} incoming={[a]} />
            </select>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

/**
 * Rooms grouped by type. A room is disabled when the incoming people don't
 * fit (people already in it don't count twice). Gender limits are shown,
 * not enforced — e.g. a baby boy staying with his mother in a women's room.
 */
function RoomOptions({ rooms, incoming }: { rooms: RoomOption[]; incoming: Attendee[] }) {
  const types = [...new Map(rooms.map((r) => [r.typeId, r.typeName])).entries()];
  return types.map(([typeId, typeName]) => (
    <optgroup key={typeId} label={typeName}>
      {rooms
        .filter((r) => r.typeId === typeId)
        .map((r) => {
          const moving = incoming.filter((a) => a.roomId !== r.id);
          const free = r.beds - r.used;
          const fits = moving.length <= free;
          const mismatch =
            r.gender && incoming.some((a) => a.gender && a.gender !== r.gender);
          return (
            <option key={r.id} value={r.id} disabled={!fits && moving.length > 0}>
              {r.name} — {r.used}/{r.beds}
              {r.gender ? ` · ${GENDER_LABEL[r.gender]}` : ""}
              {mismatch ? " ⚠" : ""}
            </option>
          );
        })}
    </optgroup>
  ));
}
