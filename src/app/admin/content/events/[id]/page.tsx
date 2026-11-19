import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, ExternalLink, MapPin, Pencil, Star } from "lucide-react";
import { prisma } from "@/lib/database";
import { can, requirePermission } from "@/lib/auth-guard";
import {
  getEventAttendeeRows,
  getEventRooms,
  getPendingPaymentBookings,
  isRegistrationOpen,
} from "@/lib/event-registration";
import { chargesFees } from "@/lib/event-fees";
import {
  CATEGORY_LABELS,
  eventTiming,
  formatEventDate,
  formatEventDateShort,
  type EventCategory,
} from "@/lib/events";
import { parseRegistrationFields } from "@/lib/schemas/event-registration.schema";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { TabsContent } from "@/app/components/animate-ui/components/animate/tabs";
import { StatusBadge, type Tone } from "@/app/admin/_components/status-badge";
import { EventTabs, type EventTab } from "./_components/event-tabs";
import { EventMoreMenu } from "./_components/event-actions";
import { OverviewPanel, type ChecklistItem } from "./_components/overview-panel";
import { RegistrationsPanel } from "./_components/registrations-panel";
import { RoomsPanel } from "./_components/rooms-panel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const TIMING_TONE: Record<string, Tone> = { upcoming: "info", live: "success", ended: "neutral" };

export default async function EventPage({ params }: Props) {
  await requirePermission("read", "Event");
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) notFound();

  // Registrations and rooms show people's details → only for roles with
  // registration access (content editors still get the overview and Edit).
  const [canSeePeople, canEdit, canExport] = await Promise.all([
    can("read", "EventRegistration"),
    can("update", "Event"),
    can("export", "EventRegistration"),
  ]);
  const isCamp = event.type === "CAMP";
  // ponytail: loads every tab's data up front; fine for camp-sized events.
  const showFees = chargesFees(event.paymentMode);
  const [rows, rooms, pending] = await Promise.all([
    canSeePeople ? getEventAttendeeRows(id) : null,
    canSeePeople && isCamp ? getEventRooms(id) : null,
    canSeePeople && event.paymentMode === "ONLINE" ? getPendingPaymentBookings(id) : [],
  ]);
  // Keep the tab after registration is switched off, if people registered.
  const showRegistrations = !!rows && (event.registrationEnabled || rows.length > 0);

  const editHref = `/admin/content/events/${event.id}/edit`;
  const registerPath = `/events/${event.slug}/register`;
  const isOpen = isRegistrationOpen(event);
  const timing = eventTiming(event.date, event.endDate);
  const cover = event.headerImageUrl ?? event.imageUrl;
  const tile = formatEventDateShort(event.date.toISOString());
  const people = rooms?.bookings.flatMap((b) => b.attendees) ?? [];
  const unassigned = people.filter((a) => !a.roomId).length;
  const beds = rooms?.rooms.reduce((n, r) => n + r.beds, 0) ?? 0;
  const used = rooms?.rooms.reduce((n, r) => n + r.used, 0) ?? 0;

  // What an organiser still has to do. Not shown once the event is over.
  const checklist: ChecklistItem[] =
    timing.phase === "ended"
      ? []
      : [
          { label: "Published", done: event.status === "PUBLISHED", href: editHref, cta: "Publish" },
          { label: "Cover image added", done: !!cover, href: editHref, cta: "Add image" },
          ...(event.registrationEnabled
            ? [
                {
                  label: "Registration form has questions",
                  done: parseRegistrationFields(event.registrationFields).length > 0,
                  href: `${editHref}`,
                  cta: "Build form",
                },
                { label: "Registration open", done: isOpen, href: editHref, cta: "Check dates" },
              ]
            : []),
          ...(rooms
            ? [{ label: "Rooms set up", done: rooms.rooms.length > 0, href: "?tab=rooms", cta: "Set up rooms" }]
            : []),
          ...(rooms && people.length
            ? [{ label: "Everyone has a room", done: unassigned === 0, href: "?tab=rooms", cta: "Allocate" }]
            : []),
        ].filter((item) => canEdit || item.href !== editHref);

  const tabs: EventTab[] = [
    { value: "overview", label: "Overview" },
    ...(showRegistrations ? [{ value: "registrations", label: "Registrations", badge: String(rows!.length) }] : []),
    ...(rooms
      ? [
          unassigned
            ? { value: "rooms", label: "Rooms", badge: `${unassigned} need a room`, attention: true }
            : { value: "rooms", label: "Rooms", badge: `${used}/${beds}` },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          href="/admin/content/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Events
        </Link>

        <div className="relative h-28 overflow-hidden rounded-xl bg-midnight-green sm:h-40">
          {cover && (
            <Image
              src={cover}
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 1216px, 100vw"
              className="object-cover"
            />
          )}
        </div>

        <div className="flex flex-wrap items-start gap-x-5 gap-y-4 px-1">
          <div
            aria-hidden
            className="relative z-10 -mt-12 flex h-18 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-mikado-yellow text-midnight-green shadow-sm ring-4 ring-background sm:-mt-14"
          >
            <span className="text-xs font-semibold tracking-wider">{tile.month}</span>
            <span className="font-mono text-2xl font-semibold leading-none tabular-nums">{tile.day}</span>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {formatEventDate(event.date.toISOString(), event.endDate?.toISOString())}
              </span>
              {event.time && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {event.time}
                </span>
              )}
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(event.address || event.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-foreground hover:underline"
              >
                <MapPin className="h-4 w-4" />
                {event.location}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={event.status} />
              <StatusBadge status="timing" label={timing.label} tone={TIMING_TONE[timing.phase]} />
              <Badge variant="secondary">{isCamp ? "Camp" : "Meeting"}</Badge>
              <Badge variant="secondary">
                {CATEGORY_LABELS[event.category as EventCategory] ?? event.category}
              </Badge>
              {event.isFeatured && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {event.status === "PUBLISHED" && (
              <Button asChild variant="outline">
                <Link href={`/events/${event.slug}`} target="_blank">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Public page
                </Link>
              </Button>
            )}
            {canEdit && (
              <Button asChild>
                <Link href={editHref}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            )}
            <EventMoreMenu
              registerPath={isOpen ? registerPath : null}
              exportHref={canExport && rows?.length ? `/admin/content/events/${event.id}/registrations/export` : null}
            />
          </div>
        </div>
      </div>

      <EventTabs tabs={tabs}>
        <TabsContent value="overview">
          <OverviewPanel
            event={event}
            rows={showRegistrations ? rows : null}
            rooms={rooms}
            isOpen={isOpen}
            registerPath={registerPath}
            checklist={checklist}
          />
        </TabsContent>
        {showRegistrations && (
          <TabsContent value="registrations">
            <RegistrationsPanel
              eventId={event.id}
              isCamp={isCamp}
              rows={rows!}
              fields={parseRegistrationFields(event.registrationFields)}
              showFees={showFees}
              pending={pending}
            />
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
