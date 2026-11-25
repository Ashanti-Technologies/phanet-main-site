// One-off: add "which days" / "which nights" to a camp's registration form, right after arrival time.
// ONLY run --apply once the code with the `days`/`nights` question types is deployed: older code
// can't read them and would show the event's form with no questions at all.
//   pnpm tsx scripts/add-camp-day-questions.ts heaven-on-earth-2026 [--apply]
import {
  parseRegistrationFields,
  withEventDayOptions,
  type RegistrationField,
} from "../src/lib/schemas/event-registration.schema";

const [slug] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");

const QUESTIONS: RegistrationField[] = [
  {
    id: "camp_days",
    label: "Which days will you be at camp?",
    type: "days",
    required: true,
    scope: "booking",
    summary: true,
    inPersonOnly: true,
    options: [],
  },
  {
    id: "camp_nights",
    label: "Which nights will you sleep at camp?",
    description: "Leave blank if you're not sleeping over.",
    type: "nights",
    required: false,
    scope: "booking",
    summary: true,
    inPersonOnly: true,
    options: [],
  },
];

async function main() {
  if (!slug) throw new Error("Usage: add-camp-day-questions.ts <event-slug> [--apply]");
  const { prisma } = await import("../src/lib/database");
  try {
    const event = await prisma.event.findUniqueOrThrow({
      // Slug or id (the id is in the admin URL).
      where: slug.startsWith("cm") && !slug.includes("-") ? { id: slug } : { slug },
      select: { id: true, slug: true, title: true, date: true, endDate: true, registrationFields: true },
    });
    const fields = parseRegistrationFields(event.registrationFields);
    if (!fields.length) throw new Error("Couldn't read this event's form (or it has none); not touching it.");

    const missing = QUESTIONS.filter((q) => !fields.some((f) => f.id === q.id));
    console.log(`Event: ${event.title} (${event.slug})`);
    if (!missing.length) return console.log(`${event.title}: both questions are already there.`);

    // Insert after arrival time (else at the end), with options from the event dates.
    const at = fields.findIndex((f) => f.id === "arrival_time");
    const added = withEventDayOptions(missing, event.date, event.endDate);
    const next = at < 0 ? [...fields, ...added] : [...fields.slice(0, at + 1), ...added, ...fields.slice(at + 1)];

    console.log(`${event.title}: adding ${added.length} question(s)`);
    for (const q of added) console.log(`  ${q.label}${q.required ? " (required)" : ""}\n    ${q.options.join(" | ")}`);
    console.log(`Form order: ${next.map((f) => f.id).join(", ")}`);
    if (!apply) return console.log("Dry run. Re-run with --apply AFTER the deploy is live.");

    await prisma.event.update({ where: { id: event.id }, data: { registrationFields: next as object[] } });
    console.log("Done. Existing bookings show these blank until edited.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
