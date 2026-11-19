// Self-check for event calendar files. Run: pnpm tsx scripts/calendar-check.ts
import assert from "node:assert/strict";
import { buildEventIcs, eventSpan, googleCalendarUrl, parseStartMinutes } from "../src/lib/event-calendar";

assert.equal(parseStartMinutes("12:00 PM"), 12 * 60);
assert.equal(parseStartMinutes("12:30 am"), 30);
assert.equal(parseStartMinutes("6pm – 9pm"), 18 * 60);
assert.equal(parseStartMinutes("9.30 a.m."), 9 * 60 + 30);
assert.equal(parseStartMinutes("18:45"), 18 * 60 + 45);
assert.equal(parseStartMinutes("All day"), null);
assert.equal(parseStartMinutes("13pm"), null);

const day = (s: string) => new Date(`${s}T00:00:00Z`);
const base = {
  id: "evt1",
  slug: "hoe-2026",
  title: "Heaven On Earth, 2026",
  description: "Three days; bring a Bible.\nSee you there",
  location: "Pentecost Pensions Guest House",
  address: "Gbawe",
  date: day("2026-12-30"),
  endDate: null as Date | null,
  time: "12:00 PM",
  calendarReminders: [1440, 10080, 1440],
};

// Single day, timed: 2 hours.
let span = eventSpan(base);
assert.equal(span.allDay, false);
assert.equal(span.start.toISOString(), "2026-12-30T12:00:00.000Z");
assert.equal(span.end.toISOString(), "2026-12-30T14:00:00.000Z");

// Multi-day, timed: runs to the end of the last day.
span = eventSpan({ ...base, endDate: day("2027-01-01") });
assert.equal(span.end.toISOString(), "2027-01-02T00:00:00.000Z");

// No time: all-day, DTEND is the day after the last day.
const allDay = buildEventIcs({ ...base, time: "TBC", endDate: day("2027-01-01") }, day("2026-11-19"));
assert.match(allDay, /DTSTART;VALUE=DATE:20261230\r\nDTEND;VALUE=DATE:20270102/);

const ics = buildEventIcs(base, day("2026-11-19"));
assert.match(ics, /DTSTART:20261230T120000Z\r\nDTEND:20261230T140000Z/);
assert.match(ics, /SUMMARY:Heaven On Earth\\, 2026/);
assert.match(ics, /DESCRIPTION:Three days\\; bring a Bible\.\\nSee you there/);
// Reminders deduped, longest first.
assert.deepEqual([...ics.matchAll(/TRIGGER:(.+)/g)].map((m) => m[1].trim()), ["-PT10080M", "-PT1440M"]);
assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75), "lines folded");
assert.ok(!/VALARM/.test(buildEventIcs({ ...base, calendarReminders: [] })), "no reminders → no alarms");

const g = new URL(googleCalendarUrl(base));
assert.equal(g.searchParams.get("dates"), "20261230T120000Z/20261230T140000Z");
assert.equal(g.searchParams.get("location"), "Pentecost Pensions Guest House, Gbawe");

console.log("calendar-check: ok");
