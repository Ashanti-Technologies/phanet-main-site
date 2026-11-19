import Link from "next/link";
import { ArrowRight, BedDouble, CheckCircle2, Circle, ExternalLink, MapPin } from "lucide-react";
import type { Event } from "@/app/generated/prisma/client";
import { feeTotals, type AttendeeRow, type EventRooms } from "@/lib/event-registration";
import { chargesFees } from "@/lib/event-fees";
import { formatMoney, relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Separator } from "@/app/components/ui/separator";
import { TONE_TEXT } from "@/app/admin/_components/status-badge";
import { CopyLinkButton } from "./event-actions";

export type ChecklistItem = { label: string; done: boolean; href: string; cta: string };

const DAY = 86_400_000;

/** "28 Dec, 12:00 · in 39 days" (Accra time). */
function closingLabel(closes: Date): string {
  const when = closes.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Accra",
  });
  const days = Math.ceil((closes.getTime() - Date.now()) / DAY);
  if (days < 0) return when;
  return `${when} · ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`;
}

export function OverviewPanel({
  event,
  rows,
  rooms,
  isOpen,
  registerPath,
  checklist,
}: {
  event: Event;
  rows: AttendeeRow[] | null;
  rooms: EventRooms | null;
  isOpen: boolean;
  registerPath: string;
  checklist: ChecklistItem[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <RegistrationStrip
          event={event}
          rows={rows}
          rooms={rooms}
          isOpen={isOpen}
          registerPath={registerPath}
        />
        {checklist.length > 0 && <Checklist items={checklist} />}
        {rows && <RecentBookings rows={rows} isOpen={isOpen} registerPath={registerPath} />}
      </div>

      <aside className="space-y-5 lg:border-l lg:pl-8">
        <section className="space-y-2">
          <h2 className="text-sm font-medium">About</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        </section>
        <Separator />
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Where</h2>
          <div className="text-sm">
            <p>{event.location}</p>
            {event.address && <p className="text-muted-foreground">{event.address}</p>}
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(event.address || event.location)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
          >
            <MapPin className="h-3.5 w-3.5" /> Open in Maps
          </a>
        </section>
        {rooms && (
          <>
            <Separator />
            <RoomsSnapshot rooms={rooms} />
          </>
        )}
      </aside>
    </div>
  );
}

function RegistrationStrip({
  event,
  rows,
  rooms,
  isOpen,
  registerPath,
}: {
  event: Event;
  rows: AttendeeRow[] | null;
  rooms: EventRooms | null;
  isOpen: boolean;
  registerPath: string;
}) {
  const closes = event.registrationClosesAt ?? event.date;
  const checkedIn = rows?.filter((r) => r.checkedIn).length ?? 0;
  const beds = rooms?.rooms.reduce((n, r) => n + r.beds, 0) ?? 0;
  const used = rooms?.rooms.reduce((n, r) => n + r.used, 0) ?? 0;

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        {event.registrationEnabled ? (
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <span
                className={cn(
                  "h-2 w-2 rounded-full bg-current",
                  isOpen ? TONE_TEXT.success : TONE_TEXT.neutral,
                )}
              />
              Registration {isOpen ? "open" : "closed"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isOpen
                ? `Closes ${closingLabel(closes)}`
                : event.status === "PUBLISHED"
                  ? `Closed ${closingLabel(closes)}`
                  : "Opens when you publish the event"}
            </p>
          </div>
        ) : event.registrationUrl ? (
          <div className="min-w-0">
            <p className="text-sm font-medium">Registration uses an external form</p>
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm text-primary underline-offset-4 hover:underline"
            >
              {event.registrationUrl}
            </a>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium">Registration is off</p>
            <p className="text-sm text-muted-foreground">
              Members can register on this website once you turn it on.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {event.registrationEnabled ? (
            <>
              {isOpen && <CopyLinkButton path={registerPath} />}
              <Button asChild variant="outline" size="sm">
                <Link href={registerPath} target="_blank">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open form
                </Link>
              </Button>
            </>
          ) : (
            !event.registrationUrl && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/content/events/${event.id}/edit`}>Turn on in Edit</Link>
              </Button>
            )
          )}
        </div>
      </div>

      {rows && (
        <dl className="flex flex-wrap gap-px border-t bg-border">
          <Metric label="People" value={rows.length} />
          <Metric label="Bookings" value={new Set(rows.map((r) => r.registrationId)).size} />
          <Metric
            label="Checked in"
            value={`${checkedIn}/${rows.length}`}
            progress={rows.length ? (checkedIn / rows.length) * 100 : 0}
          />
          {chargesFees(event.paymentMode) && (() => {
            const t = feeTotals(rows);
            return (
              <>
                <Metric
                  label="Fees collected"
                  value={`${formatMoney(t.collected)}`}
                  progress={t.expected ? (t.collected / t.expected) * 100 : 0}
                />
                <Metric label="Bookings paid" value={`${t.paidBookings}/${t.charged}`} />
              </>
            );
          })()}
          {rooms && (
            <Metric
              label="Beds filled"
              value={`${used}/${beds}`}
              progress={beds ? (used / beds) * 100 : 0}
            />
          )}
        </dl>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  progress,
}: {
  label: string;
  value: React.ReactNode;
  progress?: number;
}) {
  return (
    <div className="min-w-36 flex-1 space-y-1 bg-card px-5 py-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xl font-semibold tabular-nums">{value}</dd>
      {progress !== undefined && <Progress value={progress} className="h-1" />}
    </div>
  );
}

function Checklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  const allDone = done === items.length;

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-base font-medium">{allDone ? "All set" : "Get ready"}</h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {done} of {items.length} done
          </span>
          <Progress value={(done / items.length) * 100} className="h-1.5 w-24" />
        </div>
      </div>
      {!allDone && (
        <ul className="divide-y border-t">
          {items.map((item) => (
            <li key={item.label} className="flex min-h-12 items-center gap-3 px-5 py-2">
              {item.done ? (
                <CheckCircle2 className={cn("h-4 w-4 shrink-0", TONE_TEXT.success)} />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" />
              )}
              <span className={cn("text-sm", item.done && "text-muted-foreground")}>{item.label}</span>
              {!item.done && (
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link href={item.href}>
                    {item.cta} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentBookings({
  rows,
  isOpen,
  registerPath,
}: {
  rows: AttendeeRow[];
  isOpen: boolean;
  registerPath: string;
}) {
  const bookings = [
    ...rows
      .reduce((m, r) => {
        const b = m.get(r.registrationId) ?? { by: r.bookedBy, at: r.registeredAt, people: 0 };
        b.people++;
        return m.set(r.registrationId, b);
      }, new Map<string, { by: string; at: Date; people: number }>())
      .entries(),
  ]
    .sort((a, b) => b[1].at.getTime() - a[1].at.getTime())
    .slice(0, 5);

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <h2 className="text-base font-medium">Latest bookings</h2>
        {rows.length > 0 && (
          <Link
            href="?tab=registrations"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            See everyone <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {bookings.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-6">
          <p className="text-sm text-muted-foreground">
            No one has registered yet.{isOpen && " Share the link to get people signing up."}
          </p>
          {isOpen && <CopyLinkButton path={registerPath} label="Copy registration link" />}
        </div>
      ) : (
        <ul className="divide-y border-t">
          {bookings.map(([id, b]) => (
            <li key={id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {initials(b.by)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{b.by}</p>
                <p className="text-xs text-muted-foreground">
                  {b.people === 1 ? "Just themselves" : `${b.people} people`}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {relTime(b.at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RoomsSnapshot({ rooms }: { rooms: EventRooms }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Rooms</h2>
        <Link href="?tab=rooms" className="text-xs text-muted-foreground hover:text-foreground">
          Manage
        </Link>
      </div>
      {rooms.roomTypes.length === 0 ? (
        <Link
          href="?tab=rooms"
          className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-muted/40"
        >
          <BedDouble className="h-4 w-4 shrink-0" />
          No rooms yet. Set them up before allocating people.
        </Link>
      ) : (
        <ul className="space-y-3">
          {rooms.roomTypes.map((t) => {
            const beds = t.rooms.reduce((n, r) => n + r.beds, 0);
            const used = t.rooms.reduce((n, r) => n + r.used, 0);
            return (
              <li key={t.id} className="space-y-1.5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate">{t.name}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {used}/{beds}
                  </span>
                </div>
                <Progress value={beds ? (used / beds) * 100 : 0} className="h-1" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
