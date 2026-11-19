// Self-check for event-fee math. Run: pnpm tsx scripts/event-fees-check.ts
import assert from "node:assert/strict";
import { balanceMinor, paymentState, priceAttendees, priceRangeLabel } from "../src/lib/event-fees";

const tiers = [
  { id: "t_work", name: "Working class", amount: "200.00" },
  { id: "t_uni", name: "Tertiary", amount: "100.10" },
  { id: "t_kid", name: "Child", amount: "0" },
];

// Fresh booking: snapshots current prices, no float drift (100.10 + 0.20-style sums).
const fresh = priceAttendees(tiers, [{ priceTierId: "t_work" }, { priceTierId: "t_uni" }, { priceTierId: "t_kid" }]);
assert.ok(fresh);
assert.equal(fresh.totalMinor, 30010);
assert.deepEqual(fresh.attendees.map((a) => a.tierName), ["Working class", "Tertiary", "Child"]);

// Admin raised Working class to 250: an existing attendee on the same tier keeps 200;
// one who switches tier gets the current price.
const raised = tiers.map((t) => (t.id === "t_work" ? { ...t, amount: "250" } : t));
const edited = priceAttendees(raised, [
  { priceTierId: "t_work", previous: { priceTierId: "t_work", tierName: "Working class", amount: "200.00" } },
  { priceTierId: "t_work", previous: { priceTierId: "t_uni", tierName: "Tertiary", amount: "100.10" } },
]);
assert.ok(edited);
assert.deepEqual(edited.attendees.map((a) => a.amountMinor), [20000, 25000]);

// Renamed/removed tier: snapshot name survives for unchanged attendees.
const renamed = priceAttendees([], [
  { priceTierId: "gone", previous: { priceTierId: "gone", tierName: "Old name", amount: "50" } },
]);
assert.equal(renamed?.attendees[0].tierName, "Old name");

// Unknown tier on a new pick is rejected.
assert.equal(priceAttendees(tiers, [{ priceTierId: "forged" }]), null);

assert.equal(paymentState("0", "0"), "free");
assert.equal(paymentState("300.10", "0"), "unpaid");
assert.equal(paymentState("300.10", "100"), "partial");
assert.equal(paymentState("300.10", "300.10"), "paid");
assert.equal(paymentState("200", "300.10"), "overpaid");
assert.equal(balanceMinor("300.10", "100"), 20010);
assert.equal(balanceMinor("200", "300"), 0);

assert.equal(priceRangeLabel([]), "Free");
assert.equal(priceRangeLabel(["0"]), "Free");
assert.equal(priceRangeLabel(["200", "200"]), "GH₵200");
assert.equal(priceRangeLabel(["0", "100.5", "200"]), "Free – GH₵200");

console.log("event-fees-check: ok");
