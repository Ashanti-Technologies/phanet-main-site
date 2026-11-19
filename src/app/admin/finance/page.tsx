import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { can, requirePermission } from "@/lib/auth-guard";
import { getFinanceSummary } from "@/lib/reports";
import { listBudgets } from "@/actions/finance";
import { formatMoney } from "@/lib/format";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Stat } from "@/app/admin/_components/stat";
import { DateRangePicker } from "@/app/admin/_components/date-range-picker";
import { FinanceTrendChart } from "./_components/trend-chart";
import { BudgetProgress } from "./_components/budget-progress";
import { METHOD_LABELS } from "./_components/labels";
import { parseFinanceRange, rangeQuery, type FinanceSearchParams } from "./_components/range";

function Breakdown({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing in this period.</p>}
        {rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{r.label}</span>
              <span className="font-mono tabular-nums">{formatMoney(r.value)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${total ? (r.value / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function FinanceOverviewPage({ searchParams }: { searchParams: FinanceSearchParams }) {
  await requirePermission("read", "Income");
  const canEdit = await can("create", "Income");
  const range = parseFinanceRange(await searchParams);
  const [s, budgets] = await Promise.all([getFinanceSummary(range.from, range.to), listBudgets(range)]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Income received and expenses paid, by fund and category.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DateRangePicker />
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/finance/export?${rangeQuery(range)}`}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Link>
          </Button>
          {canEdit && (
            <Button asChild size="sm">
              <Link href="/admin/finance/income/new">
                <Plus className="mr-1.5 h-4 w-4" /> Record income
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Income" value={formatMoney(s.incomeTotal)} tone="success" />
        <Stat label="Expenses paid" value={formatMoney(s.expenseTotal)} />
        <Stat label="Net" value={formatMoney(s.net)} tone={s.net < 0 ? "danger" : undefined} />
        <Stat label="Awaiting payment" value={formatMoney(s.awaitingPayment)} tone={s.awaitingPayment ? "warning" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income vs. expenses by month</CardTitle>
        </CardHeader>
        <CardContent>
          {s.monthly.length ? (
            <FinanceTrendChart data={s.monthly} />
          ) : (
            <p className="text-sm text-muted-foreground">Nothing recorded in this period.</p>
          )}
        </CardContent>
      </Card>

      {budgets.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Budgets in this period</CardTitle>
            <Link href="/admin/finance/budgets" className="text-sm text-primary hover:underline">
              Manage
            </Link>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {budgets.map((b) => (
              <BudgetProgress key={b.id} b={b} />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Breakdown title="Income by fund" rows={s.byFund} />
        <Breakdown
          title="Income by method"
          rows={s.byMethod.map((r) => ({ ...r, label: METHOD_LABELS[r.label as keyof typeof METHOD_LABELS] ?? r.label }))}
        />
        <Breakdown title="Expenses by category" rows={s.byCategory} />
      </div>
    </div>
  );
}
