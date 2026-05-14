"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarPlus,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";
import { setMyEventRsvp } from "@/actions/member-portal";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { EmptyState } from "../../_components/empty-state";

type EventItem = {
  id: string;
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  rsvpStatus: "GOING" | "CANCELLED" | null;
};

const FILTERS: Array<{
  key: "upcoming" | "past" | "rsvp";
  label: string;
}> = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
  { key: "rsvp", label: "My RSVPs" },
];

export function EventsTab({
  events,
  filter,
}: {
  events: EventItem[];
  filter: "upcoming" | "past" | "rsvp";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setFilter(next: "upcoming" | "past" | "rsvp") {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", "events");
    if (next === "upcoming") sp.delete("events");
    else sp.set("events", next);
    router.push(`/me/connect?${sp.toString()}`);
  }

  function rsvp(eventId: string, status: "GOING" | "CANCELLED") {
    setPendingId(eventId);
    startTransition(async () => {
      await setMyEventRsvp({ eventId, status });
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center rounded-full border bg-muted/40 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              filter === f.key
                ? "bg-midnight-green text-mikado-yellow shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={
            filter === "upcoming"
              ? "Nothing on the calendar yet"
              : filter === "past"
                ? "No past events to look back on yet"
                : "You haven't RSVP'd to anything yet"
          }
          description={
            filter === "upcoming"
              ? "When the next gathering is announced you'll see it here first."
              : filter === "past"
                ? "Past events will appear here once they happen."
                : "Find something that excites you on the upcoming list."
          }
          action={
            filter === "rsvp"
              ? { label: "Browse upcoming events", href: "/me/connect" }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const eventDate = new Date(event.date);
            const isPast = eventDate < new Date();
            return (
              <div
                key={event.id}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/events/${event.slug}`}
                        className="text-base font-semibold text-foreground hover:underline"
                      >
                        {event.title}
                      </Link>
                      {event.rsvpStatus === "GOING" ? (
                        <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                          Going
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {eventDate.toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {event.time}
                      </span>
                      {event.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isPast ? (
                      event.rsvpStatus === "GOING" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending && pendingId === event.id}
                          onClick={() => rsvp(event.id, "CANCELLED")}
                        >
                          {isPending && pendingId === event.id && (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          )}
                          Cancel RSVP
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isPending && pendingId === event.id}
                          onClick={() => rsvp(event.id, "GOING")}
                          className="bg-mikado-yellow text-midnight-green hover:bg-mikado-yellow/90"
                        >
                          {isPending && pendingId === event.id ? (
                            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="mr-1.5 h-3 w-3" />
                          )}
                          RSVP
                        </Button>
                      )
                    ) : null}
                    <Button asChild size="sm" variant="outline">
                      <a href={`/api/events/${event.id}/ics`} download>
                        <CalendarPlus className="mr-1.5 h-3 w-3" />
                        Calendar
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/events/${event.slug}`}>
                        Details
                        <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
