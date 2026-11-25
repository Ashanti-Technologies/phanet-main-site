// Self-check for event registration answer validation.
// Run: pnpm tsx scripts/check-registration-answers.ts
import assert from "node:assert/strict";
import {
  checkAnswer,
  DEFAULT_REGISTRATION_FIELDS,
  eventDayOptions,
  fieldAnswer,
  withEventDayOptions,
  eventRegistrationFieldsSchema,
  parseRegistrationFields,
  validateAnswers,
  type RegistrationField,
} from "../src/lib/schemas/event-registration.schema";
import { toCsv } from "../src/lib/reports";

const fields: RegistrationField[] = [
  { id: "size", label: "T-shirt", type: "select", options: ["S", "M"], required: true, scope: "person", summary: true },
  { id: "choir", label: "Choir?", type: "checkbox", options: [], required: false, scope: "person", summary: false },
  { id: "church", label: "Church", type: "text", options: [], required: false, scope: "booking", summary: false },
];
const field = (f: Partial<RegistrationField> & Pick<RegistrationField, "type">): RegistrationField => ({
  id: "f", label: "F", options: [], required: false, scope: "booking", summary: false, ...f,
});

assert.deepEqual(validateAnswers(fields, "person", { size: "M", choir: true, junk: "x" }), {
  ok: true,
  value: { size: "M", choir: true },
});
assert.equal(validateAnswers(fields, "person", {}).ok, false); // required missing
assert.equal(validateAnswers(fields, "person", { size: "XXL" }).ok, false); // not an option
assert.deepEqual(validateAnswers(fields, "booking", { church: "  " }), { ok: true, value: {} });
assert.deepEqual(parseRegistrationFields("garbage"), []);
assert.equal(parseRegistrationFields(fields).length, 3);
assert.deepEqual(validateAnswers(fields, "person", {}), { ok: false, error: "T-shirt: This is required" });

// Default template is valid (its ids are baked into the migration).
assert.equal(eventRegistrationFieldsSchema.safeParse(DEFAULT_REGISTRATION_FIELDS).success, true);
assert.equal(eventRegistrationFieldsSchema.safeParse([field({ type: "select" })]).success, false); // no options

// One rule per field type.
const num = field({ type: "number", min: 1, max: 10, required: true });
assert.deepEqual(checkAnswer(num, " 4 "), { ok: true, value: 4 });
assert.equal(checkAnswer(num, "11").ok, false);
assert.equal(checkAnswer(num, "abc").ok, false);
assert.equal(checkAnswer(num, "").ok, false);
assert.deepEqual(checkAnswer(field({ type: "number" }), ""), { ok: true, value: undefined });
assert.equal(checkAnswer(field({ type: "phone" }), "+233 24 123 4567").ok, true);
assert.equal(checkAnswer(field({ type: "phone" }), "call me").ok, false);
assert.equal(checkAnswer(field({ type: "date" }), "2026-12-01").ok, true);
assert.equal(checkAnswer(field({ type: "date" }), "1/12/2026").ok, false);
assert.equal(checkAnswer(field({ type: "time" }), "23:59").ok, true);
assert.equal(checkAnswer(field({ type: "time" }), "24:00").ok, false);
assert.equal(checkAnswer(field({ type: "datetime" }), "2026-12-01T09:30").ok, true);
assert.equal(checkAnswer(field({ type: "datetime" }), "2026-12-01T").ok, false); // date without time
const many = field({ type: "checkboxes", options: ["A", "B", "C"], required: true });
assert.deepEqual(checkAnswer(many, ["C", "A", "A"]), { ok: true, value: ["A", "C"] });
assert.equal(checkAnswer(many, []).ok, false);
assert.equal(checkAnswer(many, ["Z"]).ok, false);
assert.equal(checkAnswer(field({ type: "checkbox", required: true }), false).ok, false);
assert.deepEqual(checkAnswer(field({ type: "switch", required: true }), undefined), { ok: true, value: false });

// Camp days / nights: options from the event dates; guests answer for themselves.
const camp = [new Date("2026-12-30T12:00:00Z"), new Date("2027-01-03T00:00:00Z")] as const;
assert.deepEqual(eventDayOptions("days", ...camp), [
  "Day 1 · Wed 30 Dec", "Day 2 · Thu 31 Dec", "Day 3 · Fri 1 Jan", "Day 4 · Sat 2 Jan", "Day 5 · Sun 3 Jan",
]);
assert.deepEqual(eventDayOptions("nights", ...camp), ["Wed 30 Dec", "Thu 31 Dec", "Fri 1 Jan", "Sat 2 Jan"]);
assert.deepEqual(eventDayOptions("nights", camp[0]), []); // one-day event: no nights
const [days] = withEventDayOptions([field({ id: "days", type: "days", required: true })], ...camp);
assert.equal(eventRegistrationFieldsSchema.safeParse([{ ...days, options: [] }]).success, true); // filled on save
assert.equal(checkAnswer(days, ["Day 1 · Wed 30 Dec"]).ok, true);
assert.equal(checkAnswer(days, []).ok, false);
// Booking-scoped days are dropped for a non-guest's own answers, kept (and required) for a guest.
assert.deepEqual(validateAnswers([days], "person", { days: ["Day 2 · Thu 31 Dec"] }), { ok: true, value: {} });
assert.equal(validateAnswers([days], "person", {}, true, true).ok, false);
assert.deepEqual(validateAnswers([days], "person", { days: ["Day 2 · Thu 31 Dec"] }, true, true), {
  ok: true,
  value: { days: ["Day 2 · Thu 31 Dec"] },
});
// Guest's own answer wins over the booking's.
assert.deepEqual(fieldAnswer({ personAnswers: { days: ["Day 2 · Thu 31 Dec"] }, bookingAnswers: { days: ["Day 1 · Wed 30 Dec"] } }, days), ["Day 2 · Thu 31 Dec"]);
assert.deepEqual(fieldAnswer({ personAnswers: {}, bookingAnswers: { days: ["Day 1 · Wed 30 Dec"] } }, days), ["Day 1 · Wed 30 Dec"]);

// CSV export: formulas neutralised, phone numbers untouched.
assert.equal(
  toCsv([{ a: "+233 24 123 4567", b: "=HYPERLINK(1)", c: "+cmd|x", d: 'say "hi", ok', e: -3 }]).split("\n")[1],
  `+233 24 123 4567,'=HYPERLINK(1),'+cmd|x,"say ""hi"", ok",-3`,
);
console.log("registration answers + csv: ok");
process.exit(0); // reports.ts opens a DB pool on import
