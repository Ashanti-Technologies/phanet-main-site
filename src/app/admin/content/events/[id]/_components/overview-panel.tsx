import Link from "next/link";
import type { Event } from "@/app/generated/prisma/client";
import { isRegistrationOpen, type AttendeeRow, type EventRooms } from "@/lib/event-registration";
import { CATEGORY_LABELS, formatEventDate, type EventCategory } from "@/lib/events";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Progress } from "@/app/components/ui/progress";
import { Stat } from "./stat";

export function OverviewPanel({
  event,
  rows,
  rooms,
}: {
  event: Event;
  rows: AttendeeRow[] | null;
  rooms: EventRooms | null;
}) {
  const open = isRegistrationOpen(event);
  const closes = event.registrationClosesAt ?? event.date;

  return (
    <div className="space-y-6">
      {rows && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="People" value={rows.length} />
          <Stat label="Bookings" value={new Set(rows.map((r) => r.registrationId)).size} />
          <Stat label="Checked in" value={`${rows.filter((r) => r.checkedIn).length} / ${rows.length}`} />
          <Stat label="With allergies" value={rows.filter((r) => r.allergies).length} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-2 text-sm">
              <Item label="Date">
                {formatEventDate(event.date.toISOString(), event.endDate?.toISOString())}
              </Item>
              <Item label="Time">{event.time}</Item>
              <Item label="Location">
                {event.location}
                {event.address && <span className="block text-muted-foreground">{event.address}</span>}
              </Item>
              <Item label="Category">
                {CATEGORY_LABELS[event.category as EventCategory] ?? event.category}
              </Item>
              <Item label="Type">{event.type === "CAMP" ? "Camp (with accommodation)" : "Meeting"}</Item>
              <Item label="Featured">{event.isFeatured ? "Yes" : "No"}</Item>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">{event.description}</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {event.registrationEnabled ? (
                <>
                  <Badge variant={open ? "default" : "outline"}>{open ? "Open" : "Closed"}</Badge>
                  <p>
                    {open ? "Closes" : "Closed"}{" "}
                    {closes.toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Africa/Accra",
                    })}
                  </p>
                  <Link
                    href={`/events/${event.slug}/register`}
                    target="_blank"
                    className="inline-block underline-offset-4 hover:underline"
                  >
                    Open the registration form
                  </Link>
                </>
              ) : event.registrationUrl ? (
                <p>
                  External form:{" "}
                  <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                    {event.registrationUrl}
                  </a>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Off. Turn on &ldquo;Members register on this website&rdquo; in Edit.
                </p>
              )}
            </CardContent>
          </Card>

          {rooms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rooms</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {rooms.roomTypes.length === 0 ? (
                  <p className="text-muted-foreground">No rooms set up yet — use the Rooms tab.</p>
                ) : (
                  rooms.roomTypes.map((t) => {
                    const beds = t.rooms.reduce((n, r) => n + r.beds, 0);
                    const used = t.rooms.reduce((n, r) => n + r.used, 0);
                    return (
                      <div key={t.id} className="space-y-1">
                        <div className="flex justify-between">
                          <span>
                            {t.name} <span className="text-muted-foreground">· {t.rooms.length} rooms</span>
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {used}/{beds} beds
                          </span>
                        </div>
                        <Progress value={beds ? (used / beds) * 100 : 0} className="h-1.5" />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
