// Pure scheduling rules for monthly gifts (checked in scripts/finance-check.ts).

/** Charge on days 1–28 only, so every month has the day. */
export function giftDay(start: Date): number {
  return Math.min(start.getUTCDate(), 28);
}

/** The next charge time on `dayOfMonth` (08:00 UTC) strictly after `after`. */
export function nextMonthlyCharge(after: Date, dayOfMonth: number): Date {
  const d = new Date(Date.UTC(after.getUTCFullYear(), after.getUTCMonth(), dayOfMonth, 8));
  if (d <= after) d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

export const RETRY_AFTER_DAYS = 3;
export const MAX_FAILED_CHARGES = 3;

/** After a declined renewal: retry in a few days, or pause after too many. */
export function afterFailedCharge(failedAttempts: number, now: Date) {
  const attempts = failedAttempts + 1;
  if (attempts >= MAX_FAILED_CHARGES) return { failedAttempts: attempts, status: "PAUSED" as const, nextChargeAt: null };
  const retry = new Date(now);
  retry.setUTCDate(retry.getUTCDate() + RETRY_AFTER_DAYS);
  return { failedAttempts: attempts, status: "ACTIVE" as const, nextChargeAt: retry };
}
