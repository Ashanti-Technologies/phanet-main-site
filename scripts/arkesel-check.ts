// Self-check for Arkesel webhook signatures + status mapping. Run: pnpm tsx scripts/arkesel-check.ts
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mapArkeselStatus, verifyArkeselSignature } from "../src/lib/messaging/providers/arkesel";

const secret = "test-secret";
const now = 1_783_425_600_000;
const ts = String(now / 1000);
const sign = (payload: string, key = secret) =>
  `v1=${createHmac("sha256", key).update(`${ts}.${payload}`).digest("hex")}`;

// Docs example: keys sorted, compact JSON.
const params = { status: "DELIVERED", sms_id: "abc123" };
const good = sign('{"sms_id":"abc123","status":"DELIVERED"}');
assert.ok(verifyArkeselSignature(params, ts, good, secret, now), "valid signature passes");
assert.ok(!verifyArkeselSignature({ ...params, status: "EXPIRED" }, ts, good, secret, now), "tampered payload fails");
assert.ok(!verifyArkeselSignature(params, ts, sign('{"sms_id":"abc123","status":"DELIVERED"}', "other"), secret, now), "wrong secret fails");
assert.ok(!verifyArkeselSignature(params, ts, good, secret, now + 301_000), "stale timestamp fails");
assert.ok(!verifyArkeselSignature(params, null, good, secret, now), "missing timestamp fails");
assert.ok(!verifyArkeselSignature(params, ts, "v1=zz", secret, now), "garbage signature fails");
// Rotation: two signatures, either may match.
const old = sign('{"sms_id":"abc123","status":"DELIVERED"}', "old-secret");
assert.ok(verifyArkeselSignature(params, ts, `${old}, ${good}`, secret, now), "rotation header passes");
// PHP json_encode escapes non-ASCII and leaves slashes alone.
assert.ok(
  verifyArkeselSignature({ note: "Akwaaba é/ok" }, ts, sign('{"note":"Akwaaba \\u00e9/ok"}'), secret, now),
  "PHP-compatible escaping",
);

assert.equal(mapArkeselStatus("DELIVERED"), "DELIVERED");
assert.equal(mapArkeselStatus("NOT_DELIVERED"), "FAILED");
assert.equal(mapArkeselStatus("PROHIBITED"), "FAILED");
assert.equal(mapArkeselStatus("SUBMITTED"), "SENT");
assert.equal(mapArkeselStatus("weird"), null);

console.log("arkesel-check: ok");
