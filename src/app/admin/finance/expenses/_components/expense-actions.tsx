"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Wallet, X } from "lucide-react";
import { setExpenseStatus } from "@/actions/finance";
import type { ExpenseStatusKey } from "@/lib/schemas/finance.schema";
import { Button } from "@/app/components/ui/button";

// Mirrors ALLOWED_TRANSITIONS in src/actions/finance.ts (the server re-checks).
const NEXT: Record<ExpenseStatusKey, { to: ExpenseStatusKey; label: string; icon: typeof Check; variant: "default" | "outline" }[]> = {
  PENDING: [
    { to: "APPROVED", label: "Approve", icon: Check, variant: "outline" },
    { to: "PAID", label: "Approve & mark paid", icon: Wallet, variant: "default" },
    { to: "REJECTED", label: "Reject", icon: X, variant: "outline" },
  ],
  APPROVED: [
    { to: "PAID", label: "Mark paid", icon: Wallet, variant: "default" },
    { to: "REJECTED", label: "Reject", icon: X, variant: "outline" },
  ],
  PAID: [],
  REJECTED: [],
};

export function ExpenseActions({ id, status }: { id: string; status: ExpenseStatusKey }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<ExpenseStatusKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  function go(to: ExpenseStatusKey) {
    setError(null);
    setBusy(to);
    startTransition(async () => {
      try {
        await setExpenseStatus({ id, status: to });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update");
      } finally {
        setBusy(null);
      }
    });
  }

  return (
    <>
      {NEXT[status].map(({ to, label, icon: Icon, variant }) => (
        <Button key={to} size="sm" variant={variant} onClick={() => go(to)} disabled={pending}>
          {busy === to ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Icon className="mr-1.5 h-4 w-4" />}
          {label}
        </Button>
      ))}
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </>
  );
}
