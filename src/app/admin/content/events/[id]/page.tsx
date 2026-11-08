import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { prisma } from "@/lib/database";
import { can, requireAdmin } from "@/lib/auth-guard";
import { getEventAttendeeRows, getEventRooms } from "@/lib/event-registration";
import { formatEventDate } from "@/lib/events";
import { Button } from "@/app/components/ui/button";
import { TabsContent } from "@/app/components/ui/tabs";
import { StatusBadge } from "@/app/admin/_components/status-badge";
import { EventTabs } from "./_components/event-tabs";
import { OverviewPanel } from "./_components/overview-panel";
import { RegistrationsPanel } from "./_components/registrations-panel";
import { RoomsPanel } from "./_components/rooms-panel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EventPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  // Registrations and rooms show people's details → only for roles that can
  // read members (editors still get the overview and Edit).
  const canSeePeople = await can("read", "Member");
  const isCamp = event.type === "CAMP";
  // ponytail: loads every tab's data up front; fine for camp-sized events.
  const [rows, rooms] = await Promise.all([
    canSeePeople ? getEventAttendeeRows(id) : null,
    canSeePeople && isCamp ? getEventRooms(id) : null,
  ]);
  // Keep the tab after registration is switched off, if people registered.
  const showRegistrations = !!rows && (event.registrationEnabled || rows.length > 0);

  const beds = rooms?.rooms.reduce((n, r) => n + r.beds, 0) ?? 0;
  const used = rooms?.rooms.reduce((n, r) => n + r.used, 0) ?? 0;
  const tabs = [
    { value: "overview", label: "Overview" },
    ...(showRegistrations ? [{ value: "registrations", label: `Registrations · ${rows!.length}` }] : []),
    ...(rooms ? [{ value: "rooms", label: `Rooms · ${used}/${beds} beds` }] : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/content/events" aria-label="All events">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{formatEventDate(event.date.toISOString(), event.endDate?.toISOString())}</span>
            <span>·</span>
            <span>{isCamp ? "Camp" : "Meeting"}</span>
            <StatusBadge status={event.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {event.status === "PUBLISHED" && (
            <Button asChild variant="outline">
              <Link href={`/events/${event.slug}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Public page
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href={`/admin/content/events/${event.id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <EventTabs tabs={tabs}>
        <TabsContent value="overview">
          <OverviewPanel event={event} rows={showRegistrations ? rows : null} rooms={rooms} />
        </TabsContent>
        {showRegistrations && (
          <TabsContent value="registrations">
            <RegistrationsPanel eventId={event.id} isCamp={isCamp} rows={rows!} />
          </TabsContent>
        )}
        {rooms && (
          <TabsContent value="rooms">
            <RoomsPanel eventId={event.id} data={rooms} />
          </TabsContent>
        )}
      </EventTabs>
    </div>
  );
}
