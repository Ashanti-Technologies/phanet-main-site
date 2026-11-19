import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getExpense } from "@/actions/finance";
import { can, requirePermission } from "@/lib/auth-guard";
import { formatMoney } from "@/lib/format";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { StatusBadge, humanize } from "@/app/admin/_components/status-badge";
import { METHOD_LABELS } from "../../_components/labels";
import { VoidButton } from "../../_components/void-button";
import { ExpenseActions } from "../_components/expense-actions";

const fmt = (d: Date | null) =>
  d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("read", "Expense");
  const { id } = await params;
  const [e, canEdit] = await Promise.all([getExpense(id), can("update", "Expense")]);
  if (!e) notFound();
  const status = e.voidedAt ? "VOIDED" : e.status;

  const rows: [string, React.ReactNode][] = [
    ["Amount", <span key="a" className="font-mono tabular-nums">{formatMoney(e.amount)}</span>],
    ["Date", fmt(e.incurredAt)],
    ["Category", e.category.name],
    ["Paid from fund", e.fund?.name ?? "General"],
    ["Church unit", e.churchUnit?.name ?? "Whole ministry"],
    ["Method", e.method ? METHOD_LABELS[e.method] : "—"],
    ["Reference", e.reference ?? "—"],
    ["Recorded by", `${e.recordedBy.name} · ${fmt(e.createdAt)}`],
    ["Approved by", e.approvedBy ? `${e.approvedBy.name} · ${fmt(e.approvedAt)}` : "—"],
    ["Paid on", fmt(e.paidAt)],
  ];
  if (e.voidedAt) rows.push(["Voided", `${fmt(e.voidedAt)} — ${e.voidReason ?? ""}`]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/finance/expenses" aria-label="Back to expenses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{e.payee}</h1>
          <p className="text-sm text-muted-foreground">{e.description}</p>
        </div>
        <StatusBadge status={status} label={humanize(status)} />
      </div>

      {canEdit && !e.voidedAt && (
        <div className="flex flex-wrap gap-2">
          <ExpenseActions id={e.id} status={e.status} />
          <VoidButton id={e.id} kind="expense" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipt</CardTitle>
          </CardHeader>
          <CardContent>
            {e.receiptUrl ? (
              <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="block space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- receipts may be any Cloudinary asset */}
                <img src={e.receiptUrl} alt={`Receipt from ${e.payee}`} className="max-h-96 rounded-md border object-contain" />
                <span className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Open original <ExternalLink className="h-3.5 w-3.5" />
                </span>
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No receipt attached.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
