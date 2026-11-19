// Self-check for eventTiming.
// Run: pnpm tsx scripts/check-event-timing.ts
import assert from "node:assert/strict";
import { eventTiming } from "../src/lib/events";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const now = new Date("2026-11-19T15:30:00Z");

assert.deepEqual(eventTiming(d("2026-12-30"), d("2027-01-03"), now), { phase: "upcoming", label: "Starts in 41 days" });
assert.equal(eventTiming(d("2026-11-20"), null, now).label, "Starts tomorrow");
assert.deepEqual(eventTiming(d("2026-11-19"), null, now), { phase: "live", label: "Happening today" });
assert.equal(eventTiming(d("2026-11-18"), d("2026-11-22"), now).label, "Happening now · day 2 of 5");
assert.equal(eventTiming(d("2026-11-15"), d("2026-11-19"), now).label, "Happening now · day 5 of 5");
assert.deepEqual(eventTiming(d("2026-11-18"), null, now), { phase: "ended", label: "Ended yesterday" });
assert.equal(eventTiming(d("2026-11-01"), d("2026-11-16"), now).label, "Ended 3 days ago");
// endDate before date is treated as a single day
assert.equal(eventTiming(d("2026-11-19"), d("2026-11-10"), now).label, "Happening today");

console.log("event timing checks passed");
