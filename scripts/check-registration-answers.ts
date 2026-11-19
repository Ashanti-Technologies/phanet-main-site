// Self-check for event registration answer validation.
// Run: pnpm tsx scripts/check-registration-answers.ts
import assert from "node:assert/strict";
import {
  checkAnswer,
  DEFAULT_REGISTRATION_FIELDS,
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

// CSV export: formulas neutralised, phone numbers untouched.
assert.equal(
  toCsv([{ a: "+233 24 123 4567", b: "=HYPERLINK(1)", c: "+cmd|x", d: 'say "hi", ok', e: -3 }]).split("\n")[1],
  `+233 24 123 4567,'=HYPERLINK(1),'+cmd|x,"say ""hi"", ok",-3`,
);
console.log("registration answers + csv: ok");
process.exit(0); // reports.ts opens a DB pool on import
