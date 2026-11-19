"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { type Event, formatEventDate } from "@/lib/events";

export default function FeaturedEventBanner({ event }: { event: Event }) {
  // Keyed per event so a newly featured event shows the banner again.
  const storageKey = `phanet:banner-dismissed:${event.slug}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage only exists after mount
      if (localStorage.getItem(storageKey)) setDismissed(true);
    } catch {}
  }, [storageKey]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
  };

  return (
    <div className="relative flex items-center bg-crayola text-white">
      <Link
        href={`/events/${event.slug}`}
        className="group flex min-w-0 flex-1 items-center justify-center gap-2 py-2 pl-4 pr-10 text-xs sm:text-sm hover:bg-crayola/90 transition-colors"
      >
        <span className="hidden sm:inline font-bold uppercase tracking-wider text-white/80">
          Featured event
        </span>
        <span className="hidden sm:inline text-white/50">·</span>
        <span className="truncate font-semibold">{event.title}</span>
        <span className="hidden md:inline text-white/80">
          · {formatEventDate(event.date, event.endDate)} · {event.location}
        </span>
        <span className="ml-1 inline-flex shrink-0 items-center gap-1 font-semibold underline-offset-4 group-hover:underline">
          {event.registrationUrl ? "Register" : "Learn more"}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss featured event banner"
        className="absolute right-2 rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
