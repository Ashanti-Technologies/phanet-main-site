import { listExpenseCategories, listFunds } from "@/actions/finance";
import { getChurchUnits } from "@/actions/church-units";
import { requirePermission } from "@/lib/auth-guard";
import { Card, CardContent } from "@/app/components/ui/card";
import { ExpenseForm } from "../_components/expense-form";

export default async function NewExpensePage() {
  await requirePermission("create", "Expense");
  const [categories, funds, units] = await Promise.all([
    listExpenseCategories(),
    listFunds(),
    getChurchUnits(),
  ]);
  const opts = (rows: { id: string; name: string; isActive: boolean }[]) =>
    rows.filter((r) => r.isActive).map((r) => ({ value: r.id, label: r.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Record expense</h1>
        <p className="text-sm text-muted-foreground">
          Log spending with its receipt. Leave it pending if it still needs approval.
        </p>
      </div>
      <Card>
        <CardContent>
          <ExpenseForm categories={opts(categories)} funds={opts(funds)} units={opts(units)} />
        </CardContent>
      </Card>
    </div>
  );
}
