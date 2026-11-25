// One-off: arrival time goes from a clock time ("14:30") to a part of the day ("Afternoon (12pm–5pm)").
// Turns every event's `arrival_time` question into the dropdown and moves stored answers
// (bookings and unfinished drafts) into their block. Unreadable answers are listed and left alone.
// Dry run by default:
//   pnpm tsx scripts/arrival-time-blocks.ts [--apply]
import assert from "node:assert/strict";
import { ARRIVAL_BLOCKS, arrivalBlock } from "../src/lib/schemas/event-registration.schema";

const apply = process.argv.includes("--apply");
const ID = "arrival_time";

// Block edges (self-check; runs before touching anything).
const expect: [string, string | null][] = [
  ["03:59", ARRIVAL_BLOCKS[4]],
  ["04:00", ARRIVAL_BLOCKS[0]],
  ["05:59", ARRIVAL_BLOCKS[0]],
  ["06:00", ARRIVAL_BLOCKS[1]],
  ["11:59", ARRIVAL_BLOCKS[1]],
  ["12:00", ARRIVAL_BLOCKS[2]],
  ["16:59", ARRIVAL_BLOCKS[2]],
  ["17:00", ARRIVAL_BLOCKS[3]],
  ["20:59", ARRIVAL_BLOCKS[3]],
  ["21:00", ARRIVAL_BLOCKS[4]],
  ["00:00", ARRIVAL_BLOCKS[4]],
  ["9:15", ARRIVAL_BLOCKS[1]],
  ["24:00", null],
  ["morning", null],
];
for (const [time, block] of expect) assert.equal(arrivalBlock(time), block, time);

type Json = Record<string, unknown>;

/** New value for a stored answer, or undefined when it needs no change / can't be read. */
function convert(value: unknown, where: string, skipped: string[]) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if ((ARRIVAL_BLOCKS as readonly string[]).includes(value)) return undefined; // already done
  const block = arrivalBlock(value);
  if (!block) skipped.push(`${where}: ${JSON.stringify(value)}`);
  return block ?? undefined;
}

async function main() {
  const { prisma } = await import("../src/lib/database");
  try {
    const skipped: string[] = [];

    // 1. The question itself.
    const events = await prisma.event.findMany({ select: { id: true, title: true, registrationFields: true } });
    const eventUpdates = events.flatMap((e) => {
      const fields = Array.isArray(e.registrationFields) ? (e.registrationFields as Json[]) : [];
      if (!fields.some((f) => f.id === ID && f.type === "time")) return [];
      const next = fields.map((f) =>
        f.id === ID ? { ...f, type: "select", options: [...ARRIVAL_BLOCKS], summary: true, placeholder: undefined } : f,
      );
      return [{ id: e.id, title: e.title, fields: next }];
    });
    console.log(`Questions: ${eventUpdates.length} event(s) → ${eventUpdates.map((e) => e.title).join(", ") || "none"}`);

    // 2. Booking answers.
    const regs = await prisma.eventRegistration.findMany({
      select: { id: true, answers: true, registrant: { select: { fullName: true } } },
    });
    const regUpdates = regs.flatMap((r) => {
      const answers = (r.answers ?? {}) as Json;
      const block = convert(answers[ID], `booking ${r.registrant.fullName}`, skipped);
      return block ? [{ id: r.id, from: answers[ID], to: block, answers: { ...answers, [ID]: block } }] : [];
    });

    // 3. Unfinished drafts (else they'd fail the dropdown check on resume).
    const drafts = await prisma.eventRegistrationDraft.findMany({
      where: { completedAt: null },
      select: { id: true, data: true },
    });
    const draftUpdates = drafts.flatMap((d) => {
      const data = (d.data ?? {}) as Json;
      const answers = (data.answers ?? {}) as Json;
      const block = convert(answers[ID], `draft ${d.id}`, skipped);
      return block ? [{ id: d.id, data: { ...data, answers: { ...answers, [ID]: block } } }] : [];
    });

    const tally = new Map<string, number>();
    for (const u of regUpdates) tally.set(u.to, (tally.get(u.to) ?? 0) + 1);
    console.log(`Bookings: ${regUpdates.length} answer(s) to move`);
    for (const b of ARRIVAL_BLOCKS) console.log(`  ${b.padEnd(22)} ${tally.get(b) ?? 0}`);
    console.log(`Drafts: ${draftUpdates.length} answer(s) to move`);
    if (skipped.length) {
      console.log(`Left alone (not a clock time) — fix by hand if needed:`);
      for (const s of skipped) console.log(`  ${s}`);
    }
    if (!apply) return console.log("Dry run. Re-run with --apply to write.");

    // All or nothing. The remote DB needs far longer than Prisma's 5s default for ~40 round trips.
    await prisma.$transaction(
      async (tx) => {
        for (const e of eventUpdates)
          await tx.event.update({ where: { id: e.id }, data: { registrationFields: e.fields as object[] } });
        for (const r of regUpdates)
          await tx.eventRegistration.update({ where: { id: r.id }, data: { answers: r.answers as object } });
        for (const d of draftUpdates)
          await tx.eventRegistrationDraft.update({ where: { id: d.id }, data: { data: d.data as object } });
      },
      { timeout: 120_000, maxWait: 15_000 },
    );
    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
