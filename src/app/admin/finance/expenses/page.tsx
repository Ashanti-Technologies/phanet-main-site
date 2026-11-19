import Link from "next/link";
import { Plus } from "lucide-react";
import { listExpenseCategories, listExpenses } from "@/actions/finance";
import { can, requirePermission } from "@/lib/auth-guard";
import { serializePrisma } from "@/lib/serializers/serializePrisma";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { DateRangePicker } from "@/app/admin/_components/date-range-picker";
import { parseFinanceRange, type FinanceSearchParams } from "../_components/range";
import { ExpensesTable } from "./_components/expenses-table";

export default async function ExpensesPage({ searchParams }: { searchParams: FinanceSearchParams }) {
  await requirePermission("read", "Expense");
  const canEdit = await can("create", "Expense");
  const range = parseFinanceRange(await searchParams);
  const [rows, categories] = await Promise.all([
    listExpenses({ ...range, includeVoided: true }),
    listExpenseCategories(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Spending requests and payments, with receipts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DateRangePicker />
          {canEdit && (
            <Button asChild size="sm">
              <Link href="/admin/finance/expenses/new">
                <Plus className="mr-1.5 h-4 w-4" /> Record expense
              </Link>
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardContent>
          <ExpensesTable rows={serializePrisma(rows)} categories={categories.map((c) => c.name)} />
        </CardContent>
      </Card>
    </div>
  );
}
