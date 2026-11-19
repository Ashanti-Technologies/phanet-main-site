export type FinanceSearchParams = Promise<Record<string, string | string[] | undefined>>;

const DEFAULT_DAYS = 30; // matches DateRangePicker's default label

function day(v: string | string[] | undefined) {
  if (typeof v !== "string") return null;
  const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Read ?from&to (yyyy-mm-dd) written by DateRangePicker; inclusive UTC days. */
export function parseFinanceRange(params: Record<string, string | string[] | undefined>) {
  const from = day(params.from);
  const to = day(params.to);
  if (from && to) return { from, to };
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - DEFAULT_DAYS);
  return { from: start, to: end };
}

export function rangeQuery(range: { from: Date; to: Date }) {
  return `from=${range.from.toISOString().slice(0, 10)}&to=${range.to.toISOString().slice(0, 10)}`;
}
