import Link from "next/link";
import { Plus } from "lucide-react";
import { listFunds, listIncome } from "@/actions/finance";
import { can, requirePermission } from "@/lib/auth-guard";
import { serializePrisma } from "@/lib/serializers/serializePrisma";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { DateRangePicker } from "@/app/admin/_components/date-range-picker";
import { parseFinanceRange, type FinanceSearchParams } from "../_components/range";
import { IncomeTable } from "./_components/income-table";

export default async function IncomePage({ searchParams }: { searchParams: FinanceSearchParams }) {
  await requirePermission("read", "Income");
  const range = parseFinanceRange(await searchParams);
  const [rows, funds, canEdit] = await Promise.all([
    listIncome({ ...range, includeVoided: true }),
    listFunds(),
    can("create", "Income"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Income</h1>
          <p className="text-sm text-muted-foreground">
            Tithes, offerings and gifts received — cash, MoMo, bank and online.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DateRangePicker />
          {canEdit && (
            <Button asChild size="sm">
              <Link href="/admin/finance/income/new">
                <Plus className="mr-1.5 h-4 w-4" /> Record income
              </Link>
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardContent>
          <IncomeTable rows={serializePrisma(rows)} funds={funds.map((f) => f.name)} canEdit={canEdit} />
        </CardContent>
      </Card>
    </div>
  );
}
