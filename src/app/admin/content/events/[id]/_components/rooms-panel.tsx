import { BedDouble } from "lucide-react";
import type { EventRooms } from "@/lib/event-registration";
import { cn } from "@/lib/utils";
import { Progress } from "@/app/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/animate-ui/components/radix/accordion";
import { TONE_TEXT } from "@/app/admin/_components/status-badge";
import { RoomSetup, type RoomOption } from "./room-setup";
import { RoomAllocation } from "./room-allocation";

export function RoomsPanel({ eventId, data }: { eventId: string; data: EventRooms }) {
  const beds = data.rooms.reduce((n, r) => n + r.beds, 0);
  const used = data.rooms.reduce((n, r) => n + r.used, 0);
  const people = data.bookings.flatMap((b) => b.attendees);
  const unassigned = people.filter((a) => !a.roomId).length;
  const hasRooms = data.rooms.length > 0;

  return (
    <div className="space-y-6">
      {hasRooms ? (
        <section className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-base font-medium">
                <span className="font-mono tabular-nums">{used}</span> of{" "}
                <span className="font-mono tabular-nums">{beds}</span> beds filled
              </p>
              <p className="text-sm text-muted-foreground">
                {people.length} {people.length === 1 ? "person" : "people"} registered
                {unassigned > 0 && (
                  <span className={TONE_TEXT.warning}> · {unassigned} still need a room</span>
                )}
              </p>
            </div>
            <Progress value={beds ? (used / beds) * 100 : 0} className="h-1.5 w-full sm:w-48" />
          </div>
          <div className="space-y-5 border-t px-5 py-5">
            {data.roomTypes
              .filter((t) => t.rooms.length)
              .map((t) => (
                <div key={t.id} className="space-y-2">
                  <h3 className="text-sm font-medium">
                    {t.name}{" "}
                    <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
                      {t.rooms.reduce((n, r) => n + r.used, 0)}/{t.rooms.reduce((n, r) => n + r.beds, 0)}
                    </span>
                  </h3>
                  <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
                    {t.rooms.map((r) => (
                      <RoomTile key={r.id} room={r} />
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>
      ) : (
        <section className="flex flex-col items-start gap-3 rounded-xl border border-dashed p-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <BedDouble className="h-5 w-5 text-muted-foreground" />
          </span>
          <div>
            <h2 className="text-base font-medium">Set up rooms for this camp</h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              Add room types like a dormitory or family room, then the rooms and beds in each.
              After that you can put every booking in a room
              {people.length > 0 && ` — ${people.length} ${people.length === 1 ? "person is" : "people are"} waiting`}.
            </p>
          </div>
        </section>
      )}

      {hasRooms && <RoomAllocation rooms={data.rooms} bookings={data.bookings} />}

      <Accordion
        type="single"
        collapsible
        defaultValue={hasRooms ? undefined : "setup"}
        className="rounded-xl border bg-card px-5"
      >
        <AccordionItem value="setup">
          <AccordionTrigger className="text-base hover:no-underline">
            <span>
              Room setup{" "}
              <span className="text-sm font-normal text-muted-foreground">
                · {data.roomTypes.length} {data.roomTypes.length === 1 ? "type" : "types"},{" "}
                {data.rooms.length} {data.rooms.length === 1 ? "room" : "rooms"}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <RoomSetup eventId={eventId} roomTypes={data.roomTypes} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

/** One room: name, who it's for, and a dot per bed (filled = taken). */
function RoomTile({ room }: { room: RoomOption }) {
  const full = room.used >= room.beds;
  return (
    <li
      className={cn(
        "space-y-2 rounded-lg border p-2.5",
        full && "border-primary/40 bg-primary/5",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-medium">{room.name}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {full ? "Full" : `${room.used}/${room.beds}`}
        </span>
      </div>
      {/* ponytail: dots up to 24 beds, a bar beyond that (big dormitories). */}
      {room.beds <= 24 ? (
        <div className="flex flex-wrap gap-1" aria-label={`${room.used} of ${room.beds} beds taken`}>
          {Array.from({ length: room.beds }, (_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full",
                i < room.used ? "bg-primary" : "border border-muted-foreground/40",
              )}
            />
          ))}
        </div>
      ) : (
        <Progress value={(room.used / room.beds) * 100} className="h-1.5" />
      )}
      {/* Not GENDER_LABEL: room-setup is a client module, its constants aren't readable here. */}
      {room.gender && (
        <p className="text-xs text-muted-foreground">{room.gender === "MALE" ? "Men only" : "Women only"}</p>
      )}
    </li>
  );
}
