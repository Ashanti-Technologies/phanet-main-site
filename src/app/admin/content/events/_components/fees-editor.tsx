"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

export type PaymentMode = "FREE" | "DISPLAY_ONLY" | "PAY_AT_EVENT" | "ONLINE";
export type TierDraft = { key: string; id?: string; name: string; description: string; amount: string };

const MODES: { value: PaymentMode; label: string; hint: string }[] = [
  { value: "FREE", label: "Free", hint: "No fee. Shown as free on the website and to Google." },
  { value: "DISPLAY_ONLY", label: "Display only", hint: "Prices are shown publicly. Nothing is tracked or collected here." },
  {
    value: "PAY_AT_EVENT",
    label: "Pay at the event",
    hint: "Each person picks a price when registering. Bookings are confirmed and show what's owed until desk staff record the payment.",
  },
  {
    value: "ONLINE",
    label: "Pay online (Paystack)",
    hint: "Each person picks a price. Bookings are held as awaiting payment until Paystack confirms the card or Mobile Money payment.",
  },
];

let nextKey = 0;
export const newTierDraft = (t?: { id: string; name: string; description: string | null; amount: number }): TierDraft => ({
  key: `tier-${nextKey++}`,
  id: t?.id,
  name: t?.name ?? "",
  description: t?.description ?? "",
  amount: t ? String(t.amount) : "",
});

type Props = {
  mode: PaymentMode;
  onModeChange: (mode: PaymentMode) => void;
  tiers: TierDraft[];
  onTiersChange: (tiers: TierDraft[]) => void;
  fundId: string | null;
  onFundChange: (id: string) => void;
  funds: { id: string; name: string }[];
  registrationEnabled: boolean;
  /** Existing bookings made while the event didn't charge, so they have no price. */
  unpricedBookings: number;
};

export function FeesEditor({
  mode,
  onModeChange,
  tiers,
  onTiersChange,
  fundId,
  onFundChange,
  funds,
  registrationEnabled,
  unpricedBookings,
}: Props) {
  const charges = mode === "PAY_AT_EVENT" || mode === "ONLINE";
  const update = (key: string, patch: Partial<TierDraft>) =>
    onTiersChange(tiers.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  return (
    <section className="space-y-4 rounded-md border p-4">
      <div>
        <h3 className="font-medium">Fees</h3>
        <p className="text-sm text-muted-foreground">
          Set your own price categories, e.g. Basic school, High school, Tertiary, Working class.
        </p>
      </div>

      <div className="space-y-2 md:max-w-xs">
        <Label htmlFor="paymentMode">Payment</Label>
        <Select value={mode} onValueChange={(v) => onModeChange(v as PaymentMode)}>
          <SelectTrigger id="paymentMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{MODES.find((m) => m.value === mode)?.hint}</p>
      </div>

      {charges && !registrationEnabled && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Turn on website registration above to collect fees.
        </p>
      )}
      {charges && unpricedBookings > 0 && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {unpricedBookings} existing booking{unpricedBookings === 1 ? " was" : "s were"} made without a fee. They&apos;re
          priced when the person next edits their booking, or you can record a payment by hand.
        </p>
      )}

      {mode !== "FREE" && (
        <div className="space-y-3">
          {tiers.map((t) => (
            <div key={t.key} className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_8rem_auto] sm:items-start">
              <div className="space-y-2">
                <Input
                  aria-label="Price name"
                  placeholder="e.g. Tertiary student"
                  value={t.name}
                  onChange={(e) => update(t.key, { name: e.target.value })}
                />
                <Input
                  aria-label="Price description (optional)"
                  placeholder="Optional note, e.g. Bring your student ID"
                  value={t.description}
                  onChange={(e) => update(t.key, { description: e.target.value })}
                />
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  GH₵
                </span>
                <Input
                  aria-label="Amount in cedis"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  className="pl-12"
                  value={t.amount}
                  onChange={(e) => update(t.key, { amount: e.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${t.name || "price"}`}
                onClick={() => onTiersChange(tiers.filter((x) => x.key !== t.key))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => onTiersChange([...tiers, newTierDraft()])}>
            <Plus className="mr-2 h-4 w-4" />
            Add price
          </Button>
          <p className="text-xs text-muted-foreground">Use 0 for a free category, e.g. children under 5.</p>
        </div>
      )}

      {charges && (
        <div className="space-y-2 md:max-w-xs">
          <Label htmlFor="feeFund">Record fees in fund</Label>
          <Select value={fundId ?? undefined} onValueChange={onFundChange}>
            <SelectTrigger id="feeFund">
              <SelectValue placeholder="Pick a fund" />
            </SelectTrigger>
            <SelectContent>
              {funds.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Payments appear as income in this fund in Finance.</p>
        </div>
      )}
    </section>
  );
}
