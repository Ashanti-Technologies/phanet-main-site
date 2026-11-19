import { APP_CONFIG } from "@/constants";

/** Reminder choices admins can tick, in minutes before the start. */
export const REMINDER_CHOICES: [minutes: number, label: string][] = [
  [10080, "1 week before"],
  [4320, "3 days before"],
  [1440, "1 day before"],
  [180, "3 hours before"],
  [60, "1 hour before"],
  [30, "30 minutes before"],
];
/** Keep in sync with the `calendarReminders` default in schema.prisma. */
export const DEFAULT_REMINDERS = [10080, 1440];

export type CalendarEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  location: string;
  address?: string | null;
  date: Date;
  endDate: Date | null;
  /** Free text from the admin form, e.g. "6:00 PM" or "9am – 4pm". */
  time: string;
  calendarReminders: number[];
};

const MINUTE = 60_000;
const DAY = 1440 * MINUTE;

/** First clock time in the free-text `time`, as minutes after midnight; null = no usable time. */
export function parseStartMinutes(time: string): number | null {
  const ampm = time.match(/(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?m\b/i);
  if (ampm) {
    const h = Number(ampm[1]);
    const m = Number(ampm[2] ?? 0);
    if (h < 1 || h > 12 || m > 59) return null;
    return ((h % 12) + (ampm[3].toLowerCase() === "p" ? 12 : 0)) * 60 + m;
  }
  const h24 = time.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  return h24 ? Number(h24[1]) * 60 + Number(h24[2]) : null;
}

/**
 * Event dates are calendar days stored as UTC midnight, and `time` is local.
 * ponytail: assumes Ghana time (UTC+0, no DST); add a timezone field if events abroad need it.
 * No end time is stored, so a single-day event gets 2 hours and a multi-day one runs to the end of its last day.
 */
export function eventSpan(e: Pick<CalendarEvent, "date" | "endDate" | "time">) {
  const startMin = parseStartMinutes(e.time);
  const multiDay = !!e.endDate && e.endDate > e.date;
  const afterLastDay = new Date((multiDay ? e.endDate! : e.date).getTime() + DAY);
  if (startMin === null) return { allDay: true, start: e.date, end: afterLastDay };
  const start = new Date(e.date.getTime() + startMin * MINUTE);
  return { allDay: false, start, end: multiDay ? afterLastDay : new Date(start.getTime() + 120 * MINUTE) };
}

const utcStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // 20261230T120000Z
const dayStamp = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, ""); // 20261230
const eventUrl = (e: CalendarEvent) => `${APP_CONFIG.siteUrl}/events/${e.slug}`;
const place = (e: CalendarEvent) => [e.location, e.address].filter(Boolean).join(", ");
const details = (e: CalendarEvent) => [e.description.trim(), eventUrl(e)].filter(Boolean).join("\n\n");

const escapeText = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const encoder = new TextEncoder();
/** RFC 5545: lines over 75 octets continue on the next line after a space. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = encoder.encode(ch).length;
    if (bytes + b > 75) {
      out.push(cur);
      cur = " ";
      bytes = 1;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n");
}

export function buildEventIcs(e: CalendarEvent, now = new Date()): string {
  const { allDay, start, end } = eventSpan(e);
  const when = allDay
    ? [`DTSTART;VALUE=DATE:${dayStamp(start)}`, `DTEND;VALUE=DATE:${dayStamp(end)}`]
    : [`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(end)}`];
  const alarms = [...new Set(e.calendarReminders)]
    .filter((m) => m > 0)
    .sort((a, b) => b - a)
    .flatMap((m) => [
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(e.title)}`,
      `TRIGGER:-PT${m}M`,
      "END:VALARM",
    ]);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PHANET//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    // Stable per event, so re-importing updates the entry instead of duplicating it.
    `UID:${e.id}@phanerosisnetwork.com`,
    `DTSTAMP:${utcStamp(now)}`,
    ...when,
    `SUMMARY:${escapeText(e.title)}`,
    `DESCRIPTION:${escapeText(details(e))}`,
    `LOCATION:${escapeText(place(e))}`,
    `URL:${eventUrl(e)}`,
    ...alarms,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}

/** Google's add-event link. Google ignores reminders here; people get their own calendar defaults. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const { allDay, start, end } = eventSpan(e);
  const fmt = allDay ? dayStamp : utcStamp;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: details(e),
    location: place(e),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export const icsUrl = (e: Pick<CalendarEvent, "id">) => `${APP_CONFIG.siteUrl}/api/events/${e.id}/ics`;
