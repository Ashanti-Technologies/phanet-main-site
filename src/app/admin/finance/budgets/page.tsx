import { listBudgets, listExpenseCategories } from "@/actions/finance";
import { getChurchUnits } from "@/actions/church-units";
import { can, requirePermission } from "@/lib/auth-guard";
import { Card, CardContent } from "@/app/components/ui/card";
import { BudgetDialog } from "./_components/budget-dialog";
import { BudgetList } from "./_components/budget-list";

export default async function BudgetsPage() {
  await requirePermission("read", "Budget");
  const [budgets, categories, units, canEdit] = await Promise.all([
    listBudgets(),
    listExpenseCategories(),
    getChurchUnits(),
    can("create", "Budget"),
  ]);
  const options = {
    categories: categories.filter((c) => c.isActive).map((c) => ({ value: c.id, label: c.name })),
    units: units.map((u) => ({ value: u.id, label: u.name })),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Plan spending by category or church unit, and track paid expenses against it.
          </p>
        </div>
        {canEdit && <BudgetDialog options={options} />}
      </div>
      <Card>
        <CardContent>
          <BudgetList budgets={budgets} options={options} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
