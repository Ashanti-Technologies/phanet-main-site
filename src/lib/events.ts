export type EventCategory =
  | "national"
  | "regional"
  | "university-chapter"
  | "diaspora";

export type Recurrence = {
  frequency: "WEEKLY";
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday
  timeUTC: string; // "HH:mm"
  durationMinutes: number;
};

export type Event = {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  date: string; // ISO: "2026-05-16"
  endDate?: string; // ISO: for multi-day events
  time: string;
  location: string;
  address?: string;
  description: string;
  body: string;
  bodyHtml?: string;
  isFeatured?: boolean;
  registrationUrl?: string;
  status?: "DRAFT" | "PUBLISHED";
  recurrence?: Recurrence;
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  national: "National",
  regional: "Regional",
  "university-chapter": "University Chapter",
  diaspora: "Diaspora",
};

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  national: "bg-crayola text-white",
  regional: "bg-cerulean text-white",
  "university-chapter": "bg-mikado-yellow text-gray-900",
  diaspora: "bg-midnight-green text-white",
};

export const CATEGORY_GRADIENTS: Record<EventCategory, string> = {
  national: "from-crayola/80 to-crayola/40",
  regional: "from-cerulean/80 to-cerulean/40",
  "university-chapter": "from-mikado-yellow/80 to-mikado-yellow/40",
  diaspora: "from-midnight-green/80 to-midnight-green/40",
};

// Event dates are calendar days stored as UTC midnight ("2026-05-16"), so
// format in UTC — local time would show the previous day west of GMT.
export function formatEventDate(date: string, endDate?: string): string {
  const start = new Date(date);
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  };
  if (!endDate) return start.toLocaleDateString("en-US", opts);
  const end = new Date(endDate);
  // Same month: "May 16–18, 2026"
  if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
    return `${start.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" })} ${start.getUTCDate()}–${end.getUTCDate()}, ${start.getUTCFullYear()}`;
  }
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

export function formatEventDateShort(date: string): { month: string; day: string } {
  const d = new Date(date);
  return {
    month: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
    day: String(d.getUTCDate()),
  };
}

// ============================================
// RECURRING EVENTS (Elim Hour, etc.)
// ============================================

export const ELIM_HOUR: Event = {
  id: "elim-hour",
  slug: "elim-hour",
  title: "Elim Hour",
  category: "national",
  date: "2026-01-04", // anchor — actual occurrences computed from recurrence
  time: "Sundays · 7:00 PM GMT",
  location: "Online",
  description:
    "Our weekly online gathering for worship, the Word, and intercession together — every Sunday evening.",
  body: "",
  isFeatured: true,
  recurrence: {
    frequency: "WEEKLY",
    dayOfWeek: 0,
    timeUTC: "19:00",
    durationMinutes: 90,
  },
};

export function getNextOccurrence(
  recurrence: Recurrence,
  now: Date = new Date(),
): Date {
  const [hh, mm] = recurrence.timeUTC.split(":").map(Number);
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hh,
      mm,
      0,
      0,
    ),
  );
  const daysUntil = (recurrence.dayOfWeek - next.getUTCDay() + 7) % 7;
  if (daysUntil === 0 && next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCDate(next.getUTCDate() + daysUntil);
  }
  return next;
}

export function getNextElimHour(now?: Date): { date: Date; event: Event } {
  return {
    date: getNextOccurrence(ELIM_HOUR.recurrence!, now),
    event: ELIM_HOUR,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIcsDateUTC(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function buildIcsForEvent(event: Event, occurrence: Date): string {
  const duration = event.recurrence?.durationMinutes ?? 60;
  const end = new Date(occurrence.getTime() + duration * 60_000);
  const uid = `${event.id}-${occurrence.toISOString()}@phanerosisnetwork.com`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PHANET//Elim Hour//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsDateUTC(new Date())}`,
    `DTSTART:${toIcsDateUTC(occurrence)}`,
    `DTEND:${toIcsDateUTC(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
