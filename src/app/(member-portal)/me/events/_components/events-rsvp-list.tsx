"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setMyEventRsvp } from "@/actions/member-portal";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

type EventItem = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  rsvpStatus: "GOING" | "CANCELLED" | null;
};

export function EventsRsvpList({ events }: { events: EventItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setRsvp(eventId: string, status: "GOING" | "CANCELLED") {
    setPendingId(eventId);
    startTransition(async () => {
      await setMyEventRsvp({ eventId, status });
      setPendingId(null);
      router.refresh();
    });
  }

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No upcoming events are currently published.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-md border p-4"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-medium">{event.title}</h2>
              {event.rsvpStatus && <Badge variant="outline">{event.rsvpStatus}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date(event.date).toLocaleDateString()} · {event.time} ·{" "}
              {event.location}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isPending && pendingId === event.id}
              onClick={() => setRsvp(event.id, "GOING")}
            >
              {isPending && pendingId === event.id && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              RSVP
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending && pendingId === event.id}
              onClick={() => setRsvp(event.id, "CANCELLED")}
            >
              Cancel
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
