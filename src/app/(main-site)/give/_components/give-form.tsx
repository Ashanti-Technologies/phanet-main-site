"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Lock } from "lucide-react";
import { startGiving, startMonthlyGiving } from "@/actions/giving";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { cn } from "@/lib/utils";

const PRESETS = [50, 100, 200, 500, 1000];

export function GiveForm({
  funds,
  defaults,
  signedIn,
}: {
  funds: { id: string; name: string }[];
  defaults: { fullName: string; email: string };
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fundId, setFundId] = useState(funds.find((f) => f.name.toLowerCase() === "offering")?.id ?? funds[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [fullName, setFullName] = useState(defaults.fullName);
  const [email, setEmail] = useState(defaults.email);
  const [monthly, setMonthly] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await (monthly ? startMonthlyGiving : startGiving)({ fundId, amount, fullName, email });
      if (res.ok) window.location.assign(res.redirectUrl);
      else setError(res.error);
    });
  }

  if (funds.length === 0) {
    return <p className="text-gray-700">Online giving isn&apos;t available right now. Please check back soon.</p>;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900">Give towards</legend>
        <div className="flex flex-wrap gap-2">
          {funds.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFundId(f.id)}
              aria-pressed={fundId === f.id}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                fundId === f.id
                  ? "border-midnight-green bg-midnight-green text-white"
                  : "border-gray-300 bg-white text-gray-800 hover:border-midnight-green",
              )}
            >
              {f.name}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-900">How often</legend>
        <div className="inline-flex rounded-full border border-gray-300 bg-white p-1">
          {[
            { value: false, label: "One time" },
            { value: true, label: "Monthly" },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setMonthly(o.value)}
              aria-pressed={monthly === o.value}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                monthly === o.value ? "bg-midnight-green text-white" : "text-gray-700 hover:text-gray-900",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {monthly && (
          <p className="text-sm text-gray-600">
            Charged to your debit or credit card on the same day each month. You can cancel anytime from your
            member portal. Mobile Money can&apos;t be used for monthly gifts.
          </p>
        )}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="give-amount" className="text-sm font-semibold text-gray-900">
          Amount (GH₵)
        </Label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm tabular-nums transition-colors",
                amount === String(p) ? "border-crayola bg-crayola text-white" : "border-gray-300 bg-white hover:border-crayola",
              )}
            >
              {p.toLocaleString()}
            </button>
          ))}
        </div>
        <Input
          id="give-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Or enter an amount"
          className="h-12 bg-white text-lg"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="give-name" className="text-sm font-semibold text-gray-900">
            Full name
          </Label>
          <Input id="give-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 bg-white" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="give-email" className="text-sm font-semibold text-gray-900">
            Email (for your receipt)
          </Label>
          <Input id="give-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-white" required autoComplete="email" />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {monthly && !signedIn ? (
        <Link
          href="/auth/login?callbackUrl=%2Fgive"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-crayola px-6 py-3.5 font-semibold text-white transition-colors hover:bg-crayola/90"
        >
          Sign in to give monthly
        </Link>
      ) : (
      <button
        type="submit"
        disabled={pending || !fundId}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-crayola px-6 py-3.5 font-semibold text-white transition-colors hover:bg-crayola/90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {monthly ? "Set up monthly gift" : "Continue to secure payment"}
      </button>
      )}
    </form>
  );
}
