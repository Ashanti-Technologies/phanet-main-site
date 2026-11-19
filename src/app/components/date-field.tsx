"use client";

import { useState } from "react";
import { AnimateIcon } from "@animate-ui/react/icons";
import { CalendarIcon } from "@/app/components/animate-ui/icons/calendar";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { cn } from "@/lib/utils";

export function parseISODate(value: string | null): Date | undefined {
  // Parse YYYY-MM-DD as a local date; new Date("YYYY-MM-DD") is UTC and
  // shifts a day back in negative-offset timezones.
  const m = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : undefined;
}

export function toISODate(date: Date | undefined): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Fixed locale so server and browser render the same text (hydration).
function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type YearBounds = { fromYear?: number; toYear?: number; defaultMonth?: Date };

// Receives PopoverTrigger's props/ref via asChild, so it must spread them.
function Trigger({
  label,
  empty,
  ...props
}: { label: string; empty: boolean } & React.ComponentProps<typeof Button>) {
  return (
    <AnimateIcon animateOnHover asChild>
      <Button
        {...props}
        type="button"
        variant="outline"
        className={cn(
          "h-12 w-full justify-start text-left font-normal",
          empty && "text-muted-foreground",
        )}
      >
        <CalendarIcon className="mr-2 size-4" />
        <span className="truncate">{label}</span>
      </Button>
    </AnimateIcon>
  );
}

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  fromYear = 1925,
  toYear = new Date().getFullYear(),
  defaultMonth = new Date(2000, 0),
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
} & YearBounds) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger
          label={selected ? formatDate(selected) : placeholder}
          empty={!selected}
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange(toISODate(d));
            setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          defaultMonth={selected ?? defaultMonth}
        />
      </PopoverContent>
    </Popover>
  );
}

export type DateRangeValue = { from: string | null; to: string | null };

export function DateRangeField({
  value,
  onChange,
  placeholder = "Pick dates",
  fromYear = 2000,
  toYear = new Date().getFullYear() + 5,
  defaultMonth,
}: {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
} & YearBounds) {
  const [open, setOpen] = useState(false);
  const from = parseISODate(value.from);
  const to = parseISODate(value.to);
  const label = from
    ? to
      ? `${formatDate(from)} – ${formatDate(to)}`
      : formatDate(from)
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger label={label} empty={!from} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={from ? { from, to } : undefined}
          onSelect={(r) => {
            const nextFrom = toISODate(r?.from);
            const nextTo = toISODate(r?.to);
            // A single-day pick has no end date.
            onChange({
              from: nextFrom,
              to: nextTo && nextTo !== nextFrom ? nextTo : null,
            });
            if (nextFrom && nextTo && nextTo !== nextFrom) setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          defaultMonth={from ?? defaultMonth}
        />
      </PopoverContent>
    </Popover>
  );
}
