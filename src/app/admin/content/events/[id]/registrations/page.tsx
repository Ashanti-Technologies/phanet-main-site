import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/database";
import { getEventAttendeeRows, tally } from "@/lib/event-registration";
import { formatEventDate } from "@/lib/events";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { AttendeesTable } from "./_components/attendees-table";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EventRegistrationsPage({ params }: Props) {
  await requirePermission("read", "Member");
  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, title: true, date: true, endDate: true, type: true },
  });
  if (!event) notFound();

  const rows = await getEventAttendeeRows(id);
  const bookings = new Set(rows.map((r) => r.registrationId)).size;
  const checkedIn = rows.filter((r) => r.checkedIn).length;
  const allergies = rows.filter((r) => r.allergies);
  const fmtDay = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/content/events/${event.id}`} aria-label="Back to event">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Registrations</h1>
            <p className="text-muted-foreground">
              {event.title} ·{" "}
              {formatEventDate(
                event.date.toISOString(),
                event.endDate?.toISOString(),
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {event.type === "CAMP" && (
            <Button asChild variant="outline">
              <Link href={`/admin/content/events/${event.id}/rooms`}>Allocate rooms</Link>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={`/admin/content/events/${event.id}/registrations/export`}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="People" value={rows.length} />
        <Stat label="Bookings" value={bookings} />
        <Stat label="Checked in" value={`${checkedIn} / ${rows.length}`} />
        <Stat label="With allergies" value={allergies.length} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Breakdown title="Meals" rows={tally(rows, (r) => r.food, "No preference given")} />
        <Breakdown
          title="Arrivals"
          rows={tally(rows, (r) => r.arrivalDate)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([d, n]) => [fmtDay(d), n])}
        />
        <Breakdown title="Age groups" rows={tally(rows, (r) => r.ageGroup)} />
        <Breakdown title="Travel" rows={tally(rows, (r) => r.travel)} />
      </div>

      {allergies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allergies (for the kitchen)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              {allergies.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">{r.name}</span>
                  <span className="text-muted-foreground"> — {r.allergies}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Everyone registered</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendeesTable rows={rows} showRoom={event.type === "CAMP"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {rows.map(([label, n]) => (
              <li key={label} className="flex justify-between gap-4">
                <span>{label}</span>
                <span className="tabular-nums text-muted-foreground">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
