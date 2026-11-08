// Self-check for event registration answer validation.
// Run: pnpm tsx scripts/check-registration-answers.ts
import assert from "node:assert/strict";
import {
  parseRegistrationFields,
  validateAnswers,
  type RegistrationField,
} from "../src/lib/schemas/event-registration.schema";

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
console.log("registration answers: ok");
