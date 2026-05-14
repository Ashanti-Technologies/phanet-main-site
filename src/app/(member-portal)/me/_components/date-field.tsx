"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { Button } from "@/app/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { cn } from "@/lib/utils";

function parseISODate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toISODate(date: Date | undefined): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  fromYear = 1925,
  toYear,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);
  const captionToYear = toYear ?? new Date().getFullYear();
  const display = selected
    ? selected.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {display ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={(d) => {
            onChange(toISODate(d));
            setOpen(false);
          }}
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(captionToYear, 11)}
          defaultMonth={selected ?? new Date(2000, 0)}
          classNames={{
            root: "rdp-root [--rdp-accent-color:var(--foreground)] [--rdp-accent-background-color:var(--accent)] text-sm",
            months: "flex flex-col gap-3",
            month_caption:
              "flex items-center justify-center h-8 px-2 text-sm font-medium",
            dropdowns: "flex gap-1",
            dropdown:
              "rounded-md border bg-background px-1 py-0.5 text-sm",
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
            today: "font-semibold",
            selected:
              "bg-midnight-green text-white hover:bg-midnight-green/90",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
