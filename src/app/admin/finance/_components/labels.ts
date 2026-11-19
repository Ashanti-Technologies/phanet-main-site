import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/finance.schema";

export const METHOD_LABELS = PAYMENT_METHOD_LABELS;

export const METHOD_OPTIONS = Object.entries(METHOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** yyyy-mm-dd for <input type="date">, in local time. */
export function todayInput(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
