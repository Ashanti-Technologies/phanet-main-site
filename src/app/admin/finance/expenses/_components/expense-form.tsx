"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { recordExpense } from "@/actions/finance";
import type { PaymentMethodKey } from "@/lib/schemas/finance.schema";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { CloudinaryImageField } from "@/app/admin/_components/cloudinary-image-field";
import { METHOD_OPTIONS, todayInput } from "../../_components/labels";
import { ErrorBox, Field, OptionSelect } from "../../_components/form-bits";

type Opt = { value: string; label: string };

export function ExpenseForm({ categories, funds, units }: { categories: Opt[]; funds: Opt[]; units: Opt[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState({
    categoryId: "",
    fundId: "",
    churchUnitId: "",
    amount: "",
    payee: "",
    description: "",
    incurredAt: todayInput(),
    method: "" as PaymentMethodKey | "",
    reference: "",
    receiptUrl: "",
    status: "PENDING" as "PENDING" | "APPROVED" | "PAID",
  });
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await recordExpense({ ...v, method: v.method || null });
        router.push(`/admin/finance/expenses/${res.data.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category *">
          <OptionSelect value={v.categoryId} onChange={(x) => set("categoryId", x)} options={categories} placeholder="Choose a category" />
        </Field>
        <Field label="Amount (GH₵) *">
          <Input inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" required />
        </Field>
        <Field label="Paid to *">
          <Input value={v.payee} onChange={(e) => set("payee", e.target.value)} placeholder="ECG, landlord, vendor…" required />
        </Field>
        <Field label="Date *">
          <Input type="date" value={v.incurredAt} onChange={(e) => set("incurredAt", e.target.value)} required />
        </Field>
        <Field label="Paid from fund">
          <OptionSelect value={v.fundId} onChange={(x) => set("fundId", x)} options={funds} placeholder="General" none="General (no specific fund)" />
        </Field>
        <Field label="Church unit">
          <OptionSelect value={v.churchUnitId} onChange={(x) => set("churchUnitId", x)} options={units} placeholder="Whole ministry" none="Whole ministry" />
        </Field>
        <Field label="Method">
          <OptionSelect value={v.method} onChange={(x) => set("method", x as PaymentMethodKey)} options={METHOD_OPTIONS} placeholder="Not paid yet" none="Not paid yet" />
        </Field>
        <Field label="Reference">
          <Input value={v.reference} onChange={(e) => set("reference", e.target.value)} placeholder="Invoice / txn no." />
        </Field>
      </div>
      <Field label="Description *">
        <Textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={3} required />
      </Field>
      <Field label="Receipt">
        <CloudinaryImageField
          value={{ url: v.receiptUrl || undefined }}
          onChange={(img) => set("receiptUrl", img.url ?? "")}
          folder="finance/receipts"
        />
      </Field>
      <Field label="Status">
        <OptionSelect
          value={v.status}
          onChange={(x) => set("status", x as typeof v.status)}
          options={[
            { value: "PENDING", label: "Pending approval" },
            { value: "APPROVED", label: "Approved, not yet paid" },
            { value: "PAID", label: "Already paid" },
          ]}
          placeholder="Status"
        />
      </Field>
      <ErrorBox error={error} />
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !v.categoryId}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record expense
        </Button>
      </div>
    </form>
  );
}
