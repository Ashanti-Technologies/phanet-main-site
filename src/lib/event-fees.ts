// Pure event-fee math (no Prisma). Sums in integer pesewas to avoid float drift.
// Self-check: pnpm tsx scripts/event-fees-check.ts

export type PaymentMode = "FREE" | "DISPLAY_ONLY" | "PAY_AT_EVENT" | "ONLINE";
type Amount = { toString(): string } | number | string;

export function pesewas(a: Amount): number {
  return Math.round(Number(a.toString()) * 100);
}
export function cedis(p: number): number {
  return p / 100;
}

/** Modes where each attendee picks a tier and the booking owes money. */
export function chargesFees(mode: PaymentMode): boolean {
  return mode === "PAY_AT_EVENT" || mode === "ONLINE";
}

/** Modes where tiers are shown publicly. */
export function showsFees(mode: PaymentMode): boolean {
  return mode !== "FREE";
}

export type Tier = { id: string; name: string; amount: Amount };
export type PricedAttendee = { priceTierId: string | null; tierName: string | null; amountMinor: number };

/**
 * Price each attendee. An attendee who keeps the tier they booked keeps their
 * snapshot, so an admin raising a price never re-charges existing bookings.
 * Returns null for an unknown tier id (stale form / tampering).
 */
export function priceAttendees(
  tiers: Tier[],
  attendees: { priceTierId: string | null; previous?: { priceTierId: string | null; tierName: string | null; amount: Amount | null } | null }[],
): { attendees: PricedAttendee[]; totalMinor: number } | null {
  const byId = new Map(tiers.map((t) => [t.id, t]));
  const priced: PricedAttendee[] = [];
  for (const a of attendees) {
    const prev = a.previous;
    if (prev && prev.priceTierId === a.priceTierId && prev.amount != null) {
      priced.push({ priceTierId: a.priceTierId, tierName: prev.tierName, amountMinor: pesewas(prev.amount) });
      continue;
    }
    if (!a.priceTierId) {
      priced.push({ priceTierId: null, tierName: null, amountMinor: 0 });
      continue;
    }
    const tier = byId.get(a.priceTierId);
    if (!tier) return null;
    priced.push({ priceTierId: tier.id, tierName: tier.name, amountMinor: pesewas(tier.amount) });
  }
  return { attendees: priced, totalMinor: priced.reduce((s, a) => s + a.amountMinor, 0) };
}

export type PaymentState = "free" | "unpaid" | "partial" | "paid" | "overpaid";

export function paymentState(amountDue: Amount, amountPaid: Amount): PaymentState {
  const due = pesewas(amountDue);
  const paid = pesewas(amountPaid);
  if (due === 0 && paid === 0) return "free";
  if (paid === 0) return "unpaid";
  if (paid < due) return "partial";
  return paid === due ? "paid" : "overpaid";
}

export function balanceMinor(amountDue: Amount, amountPaid: Amount): number {
  return Math.max(0, pesewas(amountDue) - pesewas(amountPaid));
}

/** "Free", "GH₵200", or "Free – GH₵200" for a public price label. */
export function priceRangeLabel(amounts: Amount[]): string {
  if (amounts.length === 0) return "Free";
  const p = amounts.map(pesewas);
  const fmt = (m: number) => (m === 0 ? "Free" : `GH₵${(m / 100).toLocaleString("en-GH", { maximumFractionDigits: 2 })}`);
  const lo = Math.min(...p);
  const hi = Math.max(...p);
  return lo === hi ? fmt(lo) : `${fmt(lo)} – ${fmt(hi)}`;
}
