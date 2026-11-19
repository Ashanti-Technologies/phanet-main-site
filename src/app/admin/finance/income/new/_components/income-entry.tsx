"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { recordIncome, recordServiceCollection } from "@/actions/finance";
import type { PaymentMethodKey } from "@/lib/schemas/finance.schema";
import { formatMoney } from "@/lib/format";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/app/components/animate-ui/components/animate/tabs";
import { METHOD_OPTIONS, todayInput } from "../../../_components/labels";
import { MemberPicker, type MemberOption } from "../../../_components/member-picker";
import { ErrorBox, Field, OptionSelect } from "../../../_components/form-bits";

type Option = { id: string; name: string };
type ServiceOption = { id: string; title: string; date: string };
type CommitmentPrefill = {
  id: string;
  fullName: string;
  projectId: string;
  amountCommitted: number;
  paidSoFar: number;
  member: { id: string; fullName: string } | null;
} | null;

function SingleGiftForm({
  funds,
  services,
  commitment,
}: {
  funds: Option[];
  services: ServiceOption[];
  commitment: CommitmentPrefill;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const projectsFund = funds.find((f) => f.name.toLowerCase() === "projects");
  const remaining = commitment
    ? Math.max(Math.round((commitment.amountCommitted - commitment.paidSoFar) * 100) / 100, 0)
    : 0;

  const [v, setV] = useState({
    fundId: commitment ? (projectsFund?.id ?? "") : "",
    amount: commitment && remaining ? String(remaining) : "",
    receivedAt: todayInput(),
    method: "CASH" as PaymentMethodKey,
    reference: "",
    donorName: commitment && !commitment.member ? commitment.fullName : "",
    serviceId: "",
    note: "",
  });
  const [member, setMember] = useState<MemberOption | null>(commitment?.member ?? null);
  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => setV((p) => ({ ...p, [k]: val }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await recordIncome({
          ...v,
          memberId: member?.id ?? null,
          donorName: member ? null : v.donorName,
          commitmentId: commitment?.id ?? null,
        });
        router.push(
          commitment ? `/admin/projects/${commitment.projectId}/commitments` : "/admin/finance/income",
        );
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4">
      {commitment && (
        <p className="rounded-md bg-muted p-3 text-sm">
          Pledged {formatMoney(commitment.amountCommitted)} · paid so far {formatMoney(commitment.paidSoFar)}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fund *">
          <OptionSelect
            value={v.fundId}
            onChange={(x) => set("fundId", x)}
            options={funds.map((f) => ({ value: f.id, label: f.name }))}
            placeholder="Choose a fund"
          />
        </Field>
        <Field label="Amount (GH₵) *">
          <Input inputMode="decimal" value={v.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" required />
        </Field>
        <Field label="Date received *">
          <Input type="date" value={v.receivedAt} onChange={(e) => set("receivedAt", e.target.value)} required />
        </Field>
        <Field label="Method *">
          <OptionSelect
            value={v.method}
            onChange={(x) => set("method", x as PaymentMethodKey)}
            options={METHOD_OPTIONS}
            placeholder="Method"
          />
        </Field>
        <Field label="Member">
          <MemberPicker value={member} onChange={setMember} />
        </Field>
        <Field label="Or name (visitor / anonymous)">
          <Input
            value={member ? "" : v.donorName}
            onChange={(e) => set("donorName", e.target.value)}
            disabled={!!member}
            placeholder="Leave blank for anonymous"
          />
        </Field>
        <Field label="Reference">
          <Input value={v.reference} onChange={(e) => set("reference", e.target.value)} placeholder="MoMo txn ID, bank ref, cheque no." />
        </Field>
        <Field label="Service">
          <OptionSelect
            value={v.serviceId}
            onChange={(x) => set("serviceId", x)}
            options={services.map((s) => ({ value: s.id, label: s.title }))}
            placeholder="Not tied to a service"
            none="Not tied to a service"
          />
        </Field>
      </div>
      <Field label="Note">
        <Textarea value={v.note} onChange={(e) => set("note", e.target.value)} rows={2} />
      </Field>
      <ErrorBox error={error} />
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !v.fundId}>
          {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Record income
        </Button>
      </div>
    </form>
  );
}

type Line = { key: number; fundId: string; method: PaymentMethodKey; amount: string; reference: string };

function CollectionForm({ funds, services }: { funds: Option[]; services: ServiceOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [receivedAt, setReceivedAt] = useState(todayInput());
  const [note, setNote] = useState("");
  const offering = funds.find((f) => f.name.toLowerCase() === "offering")?.id ?? "";
  const tithe = funds.find((f) => f.name.toLowerCase() === "tithe")?.id ?? "";
  const [lines, setLines] = useState<Line[]>([
    { key: 1, fundId: offering, method: "CASH", amount: "", reference: "" },
    { key: 2, fundId: tithe, method: "CASH", amount: "", reference: "" },
    { key: 3, fundId: offering, method: "MOMO", amount: "", reference: "" },
  ]);

  const filled = lines.filter((l) => l.amount.trim());
  const total = filled.reduce((s, l) => s + (Number(l.amount.replace(/,/g, "")) || 0), 0);

  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function pickService(id: string) {
    setServiceId(id);
    const s = services.find((x) => x.id === id);
    if (s) setReceivedAt(todayInput(new Date(s.date)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await recordServiceCollection({
          serviceId: serviceId || null,
          receivedAt,
          note,
          rows: filled.map(({ fundId, method, amount, reference }) => ({ fundId, method, amount, reference })),
        });
        router.push("/admin/finance/income");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="Service">
          <OptionSelect
            value={serviceId}
            onChange={pickService}
            options={services.map((s) => ({ value: s.id, label: s.title }))}
            placeholder="Choose a service"
            none="No service (other meeting)"
          />
        </Field>
        <Field label="Date counted *">
          <Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="hidden gap-2 text-xs text-muted-foreground sm:grid sm:grid-cols-[1fr_1fr_8rem_1fr_2.5rem]">
          <span>Fund</span>
          <span>Method</span>
          <span>Amount (GH₵)</span>
          <span>Reference</span>
          <span />
        </div>
        {lines.map((l) => (
          <div key={l.key} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_8rem_1fr_2.5rem] sm:border-0 sm:p-0">
            <OptionSelect
              value={l.fundId}
              onChange={(x) => update(l.key, { fundId: x })}
              options={funds.map((f) => ({ value: f.id, label: f.name }))}
              placeholder="Fund"
            />
            <OptionSelect
              value={l.method}
              onChange={(x) => update(l.key, { method: x as PaymentMethodKey })}
              options={METHOD_OPTIONS}
              placeholder="Method"
            />
            <Input inputMode="decimal" value={l.amount} onChange={(e) => update(l.key, { amount: e.target.value })} placeholder="0.00" aria-label="Amount" />
            <Input value={l.reference} onChange={(e) => update(l.key, { reference: e.target.value })} placeholder="Optional" aria-label="Reference" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove line"
              onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
              disabled={lines.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setLines((ls) => [...ls, { key: Math.max(0, ...ls.map((x) => x.key)) + 1, fundId: offering, method: "CASH", amount: "", reference: "" }])
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add line
        </Button>
      </div>

      <div className="max-w-2xl">
        <Field label="Note">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="e.g. Counted by Bro. A and Sis. B" />
        </Field>
      </div>
      <ErrorBox error={error} />
      <div className="flex items-center justify-between gap-2 border-t pt-4">
        <p className="text-sm">
          Total <span className="font-mono font-semibold tabular-nums">{formatMoney(total)}</span>
          <span className="text-muted-foreground"> · {filled.length} line{filled.length === 1 ? "" : "s"}</span>
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || filled.length === 0 || filled.some((l) => !l.fundId)}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record collection
          </Button>
        </div>
      </div>
    </form>
  );
}

export function IncomeEntry({
  funds,
  services,
  commitment,
}: {
  funds: Option[];
  services: ServiceOption[];
  commitment: CommitmentPrefill;
}) {
  const [tab, setTab] = useState("single");
  // A pledge payment is always a single gift.
  if (commitment) return <SingleGiftForm funds={funds} services={services} commitment={commitment} />;
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full max-w-md">
        <TabsTrigger value="single">Single gift</TabsTrigger>
        <TabsTrigger value="collection">Service collection</TabsTrigger>
      </TabsList>
      <TabsContents className="mt-4">
        <TabsContent value="single" className="p-px">
          <SingleGiftForm funds={funds} services={services} commitment={null} />
        </TabsContent>
        <TabsContent value="collection" className="p-px">
          <CollectionForm funds={funds} services={services} />
        </TabsContent>
      </TabsContents>
    </Tabs>
  );
}
