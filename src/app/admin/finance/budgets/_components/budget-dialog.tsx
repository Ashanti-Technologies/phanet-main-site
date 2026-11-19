"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus } from "lucide-react";
import { saveBudget, type BudgetWithActuals } from "@/actions/finance";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { ErrorBox, Field, OptionSelect } from "../../_components/form-bits";

export type BudgetOptions = {
  categories: { value: string; label: string }[];
  units: { value: string; label: string }[];
};

function blank() {
  const y = new Date().getFullYear();
  return { name: "", categoryId: "", churchUnitId: "", periodStart: `${y}-01-01`, periodEnd: `${y}-12-31`, amount: "" };
}

export function BudgetDialog({ options, budget }: { options: BudgetOptions; budget?: BudgetWithActuals }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initial = budget
    ? {
        name: budget.name,
        categoryId: budget.categoryId ?? "",
        churchUnitId: budget.churchUnitId ?? "",
        periodStart: budget.periodStart,
        periodEnd: budget.periodEnd,
        amount: String(budget.budget),
      }
    : blank();
  const [v, setV] = useState(initial);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        // Dates are whole UTC days, matching how budgets are compared.
        await saveBudget({
          ...v,
          id: budget?.id,
          periodStart: `${v.periodStart}T00:00:00Z`,
          periodEnd: `${v.periodEnd}T00:00:00Z`,
        });
        setOpen(false);
        if (!budget) setV(blank());
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setV(initial);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        {budget ? (
          <Button variant="ghost" size="icon" aria-label={`Edit ${budget.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" /> New budget
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "New budget"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Name *">
            <Input value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 2026 Utilities" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <OptionSelect value={v.categoryId} onChange={(x) => set("categoryId", x)} options={options.categories} placeholder="All categories" none="All categories" />
            </Field>
            <Field label="Church unit">
              <OptionSelect value={v.churchUnitId} onChange={(x) => set("churchUnitId", x)} options={options.units} placeholder="Whole ministry" none="Whole ministry" />
            </Field>
            <Field label="From *">
              <Input type="date" value={v.periodStart} onChange={(e) => set("periodStart", e.target.value)} required />
            </Field>
            <Field label="To *">
              <Input type="date" value={v.periodEnd} onChange={(e) => set("periodEnd", e.target.value)} required />
            </Field>
          </div>
          <Field label="Amount (GH₵) *">
            <Input inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" required />
          </Field>
          <ErrorBox error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {budget ? "Save budget" : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
