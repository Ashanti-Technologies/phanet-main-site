// Self-check for the ledger math. Run: pnpm tsx scripts/finance-check.ts
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { budgetActuals, summarizeLedger } from "../src/lib/finance-summary";
import { verifyPaystackSignature } from "../src/lib/payments/paystack";
import { afterFailedCharge, giftDay, nextMonthlyCharge } from "../src/lib/recurring";

const d = (s: string) => new Date(`${s}T10:00:00Z`);

const s = summarizeLedger(
  [
    { amount: "0.10", receivedAt: d("2026-01-04"), method: "CASH", fund: "Offering", voidedAt: null },
    { amount: "0.20", receivedAt: d("2026-01-04"), method: "CASH", fund: "Offering", voidedAt: null },
    { amount: "500.00", receivedAt: d("2026-02-01"), method: "MOMO", fund: "Tithe", voidedAt: null },
    { amount: "999.99", receivedAt: d("2026-02-02"), method: "CASH", fund: "Tithe", voidedAt: d("2026-02-03") },
  ],
  [
    { amount: "120.50", incurredAt: d("2026-01-10"), status: "PAID", category: "Utilities", voidedAt: null },
    { amount: "80", incurredAt: d("2026-02-10"), status: "APPROVED", category: "Transport", voidedAt: null },
    { amount: "40", incurredAt: d("2026-02-11"), status: "PENDING", category: "Transport", voidedAt: null },
    { amount: "60", incurredAt: d("2026-02-12"), status: "REJECTED", category: "Other", voidedAt: null },
    { amount: "75", incurredAt: d("2026-02-12"), status: "PAID", category: "Other", voidedAt: d("2026-02-13") },
  ],
);

assert.equal(s.incomeTotal, 500.3, "voided income excluded, no float drift (0.1 + 0.2)");
assert.equal(s.expenseTotal, 120.5, "only PAID, non-voided expenses count as spent");
assert.equal(s.awaitingPayment, 120, "PENDING + APPROVED are awaiting payment; REJECTED is not");
assert.equal(s.net, Math.round((s.incomeTotal - s.expenseTotal) * 100) / 100);
assert.deepEqual(s.byFund, [
  { label: "Tithe", value: 500 },
  { label: "Offering", value: 0.3 },
]);
assert.deepEqual(s.monthly, [
  { label: "2026-01", income: 0.3, expense: 120.5 },
  { label: "2026-02", income: 500, expense: 0 },
]);

// Budgets: category/unit match (null = any), inclusive end day, PAID only.
const [jan, utilJanAccra] = budgetActuals(
  [
    { id: "jan", amount: "200", categoryId: null, churchUnitId: null, periodStart: d("2026-01-01"), periodEnd: new Date("2026-01-31T00:00:00Z") },
    { id: "u", amount: "100", categoryId: "util", churchUnitId: "accra", periodStart: d("2026-01-01"), periodEnd: new Date("2026-01-31T00:00:00Z") },
  ],
  [
    { amount: "50", incurredAt: new Date("2026-01-31T23:00:00Z"), status: "PAID", categoryId: "util", churchUnitId: "accra", voidedAt: null },
    { amount: "70.25", incurredAt: d("2026-01-15"), status: "PAID", categoryId: "util", churchUnitId: null, voidedAt: null },
    { amount: "999", incurredAt: d("2026-02-01"), status: "PAID", categoryId: "util", churchUnitId: "accra", voidedAt: null },
    { amount: "999", incurredAt: d("2026-01-10"), status: "APPROVED", categoryId: "util", churchUnitId: "accra", voidedAt: null },
    { amount: "999", incurredAt: d("2026-01-10"), status: "PAID", categoryId: "util", churchUnitId: "accra", voidedAt: d("2026-01-11") },
  ],
);
assert.deepEqual(jan, { id: "jan", budget: 200, spent: 120.25, remaining: 79.75, pct: 60 });
assert.deepEqual(utilJanAccra, { id: "u", budget: 100, spent: 50, remaining: 50, pct: 50 });

// Monthly gifts: day capped at 28, next charge strictly in the future, retries then pause.
assert.equal(giftDay(new Date("2026-01-31T12:00:00Z")), 28);
assert.equal(giftDay(new Date("2026-03-05T12:00:00Z")), 5);
assert.equal(nextMonthlyCharge(new Date("2026-01-05T07:00:00Z"), 5).toISOString(), "2026-01-05T08:00:00.000Z");
assert.equal(nextMonthlyCharge(new Date("2026-01-05T08:00:00Z"), 5).toISOString(), "2026-02-05T08:00:00.000Z");
assert.equal(nextMonthlyCharge(new Date("2026-12-28T09:00:00Z"), 28).toISOString(), "2027-01-28T08:00:00.000Z");
const now = new Date("2026-04-10T08:00:00Z");
assert.deepEqual(afterFailedCharge(0, now), { failedAttempts: 1, status: "ACTIVE", nextChargeAt: new Date("2026-04-13T08:00:00Z") });
assert.deepEqual(afterFailedCharge(2, now), { failedAttempts: 3, status: "PAUSED", nextChargeAt: null });

// Paystack webhook signature: HMAC-SHA512(raw body, secret key), hex.
process.env.PAYSTACK_SECRET_KEY = "sk_test_check";
const body = JSON.stringify({ event: "charge.success", data: { reference: "PHANET_X" } });
const good = createHmac("sha512", "sk_test_check").update(body).digest("hex");
assert.equal(verifyPaystackSignature(body, good), true);
assert.equal(verifyPaystackSignature(body + " ", good), false, "body tampered");
assert.equal(verifyPaystackSignature(body, good.slice(0, -1)), false, "short signature");
assert.equal(verifyPaystackSignature(body, null), false, "missing header");

console.log("finance-check: ok");
