export function formatCurrency(
  amount: number | string | { toString(): string },
  currency: string = "GH₵",
): string {
  return `${currency} ${Number(amount).toLocaleString()}`;
}

const COMMITMENT_LABELS: Record<string, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

/** Ledger amounts: always 2 decimals, GH₵. */
export function formatMoney(amount: number | string | { toString(): string }): string {
  return `GH₵ ${Number(amount.toString()).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCommitmentStatus(status: string): string {
  return COMMITMENT_LABELS[status] ?? status;
}

const PAYMENT_INTENT_LABELS: Record<string, string> = {
  PENDING: "Not started",
  PROCESSING: "Payment in progress",
  COMPLETED: "Paid",
  FAILED: "Payment failed",
  REFUNDED: "Refunded",
};

export function formatPaymentIntentStatus(status: string): string {
  return PAYMENT_INTENT_LABELS[status] ?? status;
}

const PRAYER_LABELS: Record<string, string> = {
  NEW: "Received",
  IN_PRAYER: "Being prayed for",
  PRAYED: "Prayed for",
  ARCHIVED: "Archived",
};

export function formatPrayerStatus(status: string): string {
  return PRAYER_LABELS[status] ?? status;
}

export function timeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDateMedium(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Short relative time: "just now", "5m ago", "3h ago", "2d ago", then "Nov 3". */
export function relTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const dy = Math.floor(hr / 24);
  if (dy < 7) return `${dy}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
