"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, BellOff } from "lucide-react";
import { bookingPulse } from "@/actions/event-registrations";
import { relTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TONE_TEXT } from "@/app/admin/_components/status-badge";
import { Button } from "@/app/components/ui/button";
import { AnimatedToastStack, useAnimatedToastStack } from "@/app/components/motion/animated-toast-stack";
import { CopyLinkButton } from "./event-actions";

export type LiveBooking = { id: string; by: string; people: number; at: string };

const POLL_MS = 20_000;
const MUTE_KEY = "phanet.bookings-muted";

/**
 * Latest bookings that update themselves: polls a cheap pulse while the tab
 * is visible and refreshes the page when it changes, with a toast and chime
 * for new bookings.
 * ponytail: polling, one request per open tab every 20s; SSE/push if many admins keep it open.
 */
export function LiveBookings({
  eventId,
  bookings,
  total,
  isOpen,
  registerPath,
}: {
  eventId: string;
  /** Newest first, at most 5. */
  bookings: LiveBooking[];
  /** Confirmed bookings, to compare with the pulse. */
  total: number;
  isOpen: boolean;
  registerPath: string;
}) {
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({ defaultDuration: 8000 });
  const muted = useSyncExternalStore(subscribeMuted, storedMuted, () => false);
  // Bookings newer than this are highlighted (set when a new one arrives).
  const [freshAfter, setFreshAfter] = useState<string | null>(null);
  const known = useRef({ count: total, latestAt: bookings[0]?.at ?? "" });

  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (document.visibilityState !== "visible") return;
      const pulse = await bookingPulse(eventId).catch(() => null);
      if (!pulse || stopped) return;
      const prev = known.current;
      const latestAt = pulse.latest?.at ?? "";
      if (pulse.count === prev.count && latestAt === prev.latestAt) return;
      known.current = { count: pulse.count, latestAt };
      router.refresh();
      if (pulse.latest && latestAt > prev.latestAt) {
        const added = Math.max(1, pulse.count - prev.count);
        setFreshAfter(prev.latestAt);
        showToast({
          status: "success",
          title: added > 1 ? `${added} new bookings` : "New booking",
          description: `${pulse.latest.by} · ${pulse.latest.people === 1 ? "just themselves" : `${pulse.latest.people} people`}`,
          action: {
            label: "View",
            onClick: (t) => {
              window.history.replaceState(null, "", `${location.pathname}?tab=registrations`);
              dismissToast(t.id);
            },
          },
        });
        if (!storedMuted()) chime();
      }
    }
    const id = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [eventId, router, showToast, dismissToast]);

  // Fade the highlight after a while.
  useEffect(() => {
    if (freshAfter === null) return;
    const id = setTimeout(() => setFreshAfter(null), 10_000);
    return () => clearTimeout(id);
  }, [freshAfter]);

  function toggleMute() {
    const next = !muted;
    try {
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(MUTE_KEY));
    if (!next) chime(); // also unlocks audio after this click
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-medium">
          <span className={cn("relative flex h-2 w-2", TONE_TEXT.success)} title="Updates live">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          Latest bookings
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={toggleMute}
          aria-label={muted ? "Turn on booking sound" : "Mute booking sound"}
          title={muted ? "Sound off" : "Sound on"}
        >
          {muted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </Button>
      </div>
      {bookings.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-6">
          <p className="text-sm text-muted-foreground">
            No one has registered yet.{isOpen && " Share the link to get people signing up."}
          </p>
          {isOpen && <CopyLinkButton path={registerPath} label="Copy registration link" />}
        </div>
      ) : (
        <>
          <ul className="divide-y border-t">
            {bookings.map((b) => (
              <li
                key={b.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 transition-colors duration-1000",
                  freshAfter !== null && b.at > freshAfter && "bg-primary/10",
                )}
              >
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
          <Link
            href="?tab=registrations"
            className="flex items-center justify-center gap-1 border-t px-5 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            See everyone <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </>
      )}
      <AnimatedToastStack toasts={toasts} onDismiss={dismissToast} placement="fixed" position="bottom-right" />
    </section>
  );
}

function storedMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeMuted(onChange: () => void) {
  window.addEventListener(MUTE_KEY, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(MUTE_KEY, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let audio: AudioContext | null = null;

/** Two soft rising notes. Silently does nothing until the page has had a click. */
function chime() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  } catch {}
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
