// Self-check for online attendance rules (no DB).
// Run: pnpm tsx scripts/online-attendance-check.ts
import assert from "node:assert/strict";
import {
  attendeeInputSchema,
  DEFAULT_REGISTRATION_FIELDS,
  fieldsFor,
  validateAnswers,
} from "../src/lib/schemas/event-registration.schema";
import { priceAttendees } from "../src/lib/event-fees";

const fields = DEFAULT_REGISTRATION_FIELDS;

// Online bookings skip the required arrival date; in-person ones don't.
assert.equal(validateAnswers(fields, "booking", {}, true).ok, false);
assert.equal(validateAnswers(fields, "booking", {}, false).ok, true);
// …and stray in-person answers from an online person are dropped.
assert.deepEqual(validateAnswers(fields, "person", { food: "Vegan" }, false), { ok: true, value: {} });
assert.ok(fieldsFor(fields, "booking", false).some((f) => f.id === "notes"));
assert.ok(!fieldsFor(fields, "person", false).some((f) => f.id === "food"));

// The server passes priceTierId null for online people: they cost nothing,
// even if they had a paid tier before switching.
const tiers = [{ id: "t1", name: "Adult", amount: "250.00" }];
const priced = priceAttendees(tiers, [
  { priceTierId: "t1" },
  { priceTierId: null, previous: { priceTierId: "t1", tierName: "Adult", amount: "250.00" } },
]);
assert.equal(priced?.totalMinor, 25000);

// Attendance defaults to in person; a location needs a country and a city.
const location = { countryId: "gh", city: "Kumasi" };
assert.equal(attendeeInputSchema.parse({ kind: "self", location }).attendance, "IN_PERSON");
assert.equal(attendeeInputSchema.safeParse({ kind: "self", location: { countryId: "", city: "Kumasi" } }).success, false);
assert.equal(attendeeInputSchema.safeParse({ kind: "self" }).success, false);

console.log("online attendance: ok");
