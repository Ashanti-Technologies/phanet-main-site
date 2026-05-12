"use client";

import { useSyncExternalStore } from "react";

type Props = {
  targetIso: string;
};

type Parts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
};

function computeParts(targetIso: string): Parts {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return { days, hours, minutes, seconds, isPast: false };
}

function subscribe(callback: () => void): () => void {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

export default function Countdown({ targetIso }: Props) {
  const parts = useSyncExternalStore<Parts | null>(
    subscribe,
    () => computeParts(targetIso),
    () => null,
  );

  if (!parts) {
    return (
      <div className="flex gap-3" aria-hidden>
        {["--", "--", "--", "--"].map((v, i) => (
          <div key={i} className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">
              {v}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (parts.isPast) {
    return (
      <p className="text-white/90 text-lg font-medium">
        We&apos;re live now — join us.
      </p>
    );
  }

  const cells: { label: string; value: number }[] = [
    { label: "Days", value: parts.days },
    { label: "Hours", value: parts.hours },
    { label: "Min", value: parts.minutes },
    { label: "Sec", value: parts.seconds },
  ];

  return (
    <div className="flex gap-3 sm:gap-4" role="timer" aria-live="polite">
      {cells.map((c) => (
        <div key={c.label} className="text-center">
          <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none">
            {String(c.value).padStart(2, "0")}
          </div>
          <div className="text-xs text-white/70 uppercase tracking-wider mt-1">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
