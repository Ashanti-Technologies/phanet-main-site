"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { assignRoom } from "@/actions/event-rooms";
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
const REL = { SELF: "Booked", SPOUSE: "Spouse", CHILD: "Child", RELATIVE: "Relative", GUEST: "Guest" } as Record<string, string>;

export function RoomAllocation({ rooms, bookings }: { rooms: RoomOption[]; bookings: Booking[] }) {
  const [onlyUnassigned, setOnlyUnassigned] = useState(true);
  const shown = onlyUnassigned
    ? bookings.filter((b) => b.attendees.some((a) => !a.roomId))
    : bookings;

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-base font-medium">Allocate rooms</h2>
          <p className="text-sm text-muted-foreground">
            Families stay together on one booking. Infants share a parent&apos;s bed; past the bed count, people go on floor mattresses.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={onlyUnassigned} onCheckedChange={(v) => setOnlyUnassigned(v === true)} />
          Only bookings that still need rooms
        </label>
      </div>
      {shown.length === 0 ? (
        <p className="border-t px-5 py-6 text-sm text-muted-foreground">
          {bookings.length ? "Everyone has a room." : "No one has registered yet."}
        </p>
      ) : (
        <div className="divide-y border-t">
          {shown.map((b) => (
            <BookingBlock key={b.id} booking={b} rooms={rooms} />
          ))}
        </div>
      )}
    </section>
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
    <section className="space-y-1 px-5 py-4" aria-busy={isPending}>
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

      <ul className="divide-y divide-dashed">
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
 * Rooms grouped by type. Mirrors assignRoom: a room is disabled when an
 * adult/teen doesn't match its gender. Children of the other gender are
 * allowed with a ⚠ (e.g. a baby boy staying with his mother). Full rooms stay
 * pickable — extra people go on floor mattresses.
 */
function RoomOptions({ rooms, incoming }: { rooms: RoomOption[]; incoming: Attendee[] }) {
  const types = [...new Map(rooms.map((r) => [r.typeId, r.typeName])).entries()];
  return types.map(([typeId, typeName]) => (
    <optgroup key={typeId} label={typeName}>
      {rooms
        .filter((r) => r.typeId === typeId)
        .map((r) => {
          const mismatched = incoming.filter((a) => r.gender && a.gender && a.gender !== r.gender);
          const blocked = mismatched.some((a) => a.ageGroup !== "CHILD" && a.ageGroup !== "INFANT");
          return (
            <option key={r.id} value={r.id} disabled={blocked}>
              {r.name} — {r.used}/{r.beds}
              {r.used >= r.beds ? " (full, floor)" : ""}
              {r.gender ? ` · ${GENDER_LABEL[r.gender]}` : ""}
              {mismatched.length ? " ⚠" : ""}
            </option>
          );
        })}
    </optgroup>
  ));
}
