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
