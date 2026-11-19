import { listExpenseCategories, listFunds } from "@/actions/finance";
import { requirePermission } from "@/lib/auth-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { NameList } from "./_components/name-list";

export default async function FundsPage() {
  await requirePermission("read", "Fund");
  const [funds, categories] = await Promise.all([listFunds(), listExpenseCategories()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Funds & categories</h1>
        <p className="text-sm text-muted-foreground">
          Funds are where giving goes; categories describe what money is spent on. Deactivate instead of deleting — old entries keep their labels.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funds</CardTitle>
            <CardDescription>Tithe, offering, building, missions…</CardDescription>
          </CardHeader>
          <CardContent>
            <NameList kind="fund" items={funds.map(({ id, name, isActive }) => ({ id, name, isActive }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense categories</CardTitle>
            <CardDescription>Utilities, rent, transport, welfare…</CardDescription>
          </CardHeader>
          <CardContent>
            <NameList kind="category" items={categories.map(({ id, name, isActive }) => ({ id, name, isActive }))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
