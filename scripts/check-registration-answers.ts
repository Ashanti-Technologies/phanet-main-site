// Self-check for event registration answer validation.
// Run: pnpm tsx scripts/check-registration-answers.ts
import assert from "node:assert/strict";
import {
  parseRegistrationFields,
  validateAnswers,
  type RegistrationField,
} from "../src/lib/schemas/event-registration.schema";
import { toCsv } from "../src/lib/reports";

const fields: RegistrationField[] = [
  { id: "size", label: "T-shirt", type: "select", options: ["S", "M"], required: true, scope: "person" },
  { id: "choir", label: "Choir?", type: "checkbox", options: [], required: false, scope: "person" },
  { id: "church", label: "Church", type: "text", options: [], required: false, scope: "booking" },
];

assert.deepEqual(validateAnswers(fields, "person", { size: "M", choir: true, junk: "x" }), {
  ok: true,
  value: { size: "M", choir: true },
});
assert.equal(validateAnswers(fields, "person", {}).ok, false); // required missing
assert.equal(validateAnswers(fields, "person", { size: "XXL" }).ok, false); // not an option
assert.deepEqual(validateAnswers(fields, "booking", { church: "  " }), { ok: true, value: {} });
assert.deepEqual(parseRegistrationFields("garbage"), []);
assert.equal(parseRegistrationFields(fields).length, 3);

// CSV export: formulas neutralised, phone numbers untouched.
assert.equal(
  toCsv([{ a: "+233 24 123 4567", b: "=HYPERLINK(1)", c: "+cmd|x", d: 'say "hi", ok', e: -3 }]).split("\n")[1],
  `+233 24 123 4567,'=HYPERLINK(1),'+cmd|x,"say ""hi"", ok",-3`,
);
console.log("registration answers + csv: ok");
process.exit(0); // reports.ts opens a DB pool on import
