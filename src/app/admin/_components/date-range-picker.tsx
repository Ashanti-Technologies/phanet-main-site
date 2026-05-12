"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DayPicker, type DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

type Preset = {
  label: string;
  days: number;
};

const PRESETS: Preset[] = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetMatches(from: Date, to: Date, days: number): boolean {
  const expectedFrom = new Date();
  expectedFrom.setHours(0, 0, 0, 0);
  expectedFrom.setDate(expectedFrom.getDate() - days);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    Math.abs(from.getTime() - expectedFrom.getTime()) < 86_400_000 &&
    Math.abs(to.getTime() - today.getTime()) < 86_400_000
  );
}

export function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const range: DateRange | undefined =
    fromParam && toParam
      ? { from: new Date(fromParam), to: new Date(toParam) }
      : undefined;

  // Resolve label
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setDate(today.getDate() - 30);

  const activeFrom = range?.from ?? defaultFrom;
  const activeTo = range?.to ?? today;

  const matchingPreset = PRESETS.find((p) =>
    presetMatches(activeFrom, activeTo, p.days),
  );

  const label = matchingPreset
    ? matchingPreset.label
    : `${format(activeFrom, "MMM d")} – ${format(activeTo, "MMM d, yyyy")}`;

  function applyRange(from: Date, to: Date) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", isoDay(from));
    params.set("to", isoDay(to));
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  }

  function applyPreset(p: Preset) {
    const to = new Date();
    to.setHours(0, 0, 0, 0);
    const from = new Date(to);
    from.setDate(to.getDate() - p.days);
    applyRange(from, to);
    setOpen(false);
  }

  function handleRangeChange(r: DateRange | undefined) {
    if (r?.from && r?.to) {
      applyRange(r.from, r.to);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 font-normal",
            pending && "opacity-60",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Presets column */}
          <div className="border-b sm:border-b-0 sm:border-r border-border p-2 sm:w-44">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              Presets
            </p>
            <div className="flex flex-col gap-0.5">
              {PRESETS.map((p) => {
                const active = matchingPreset?.days === p.days;
                return (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      active
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Calendar column */}
          <div className="p-2">
            <DayPicker
              mode="range"
              numberOfMonths={1}
              defaultMonth={activeFrom}
              selected={range ?? { from: activeFrom, to: activeTo }}
              onSelect={handleRangeChange}
              disabled={{ after: new Date() }}
              classNames={{
                root: "rdp-root [--rdp-accent-color:var(--foreground)] [--rdp-accent-background-color:var(--accent)] text-sm",
                months: "flex flex-col gap-3",
                month_caption:
                  "flex items-center justify-center h-8 px-2 text-sm font-medium",
                nav: "flex items-center gap-1",
                button_previous:
                  "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent",
                button_next:
                  "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent",
                weekday:
                  "text-[11px] font-medium text-muted-foreground w-8 h-8",
                day: "h-8 w-8 p-0 text-sm",
                day_button:
                  "h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-accent transition-colors",
                today: "font-semibold text-foreground",
                outside: "text-muted-foreground/50",
                disabled: "opacity-40 pointer-events-none",
                range_start:
                  "[&_button]:bg-foreground [&_button]:text-background [&_button]:hover:bg-foreground/90",
                range_end:
                  "[&_button]:bg-foreground [&_button]:text-background [&_button]:hover:bg-foreground/90",
                range_middle: "bg-accent/60",
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
