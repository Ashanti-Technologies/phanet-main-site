import { listRecurringGifts } from "@/actions/finance";
import { can, requirePermission } from "@/lib/auth-guard";
import { formatMoney } from "@/lib/format";
import { Card, CardContent } from "@/app/components/ui/card";
import { Stat } from "@/app/admin/_components/stat";
import { MonthlyTable } from "./_components/monthly-table";

export default async function MonthlyGiftsPage() {
  await requirePermission("read", "Income");
  const [rows, canEdit] = await Promise.all([listRecurringGifts(), can("update", "Income")]);
  const active = rows.filter((r) => r.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Monthly gifts</h1>
        <p className="text-sm text-muted-foreground">
          Card gifts charged automatically each month. Each charge appears in Income like any other gift.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Active monthly givers" value={active.length.toLocaleString()} />
        <Stat label="Expected per month" value={formatMoney(active.reduce((s, r) => s + r.amount, 0))} tone="success" />
        <Stat
          label="Paused (card declined)"
          value={rows.filter((r) => r.status === "PAUSED").length.toLocaleString()}
          tone="warning"
        />
      </div>
      <Card>
        <CardContent>
          <MonthlyTable rows={rows} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
