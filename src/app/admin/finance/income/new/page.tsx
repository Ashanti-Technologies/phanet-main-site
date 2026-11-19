import { getCommitmentForPayment, listFunds } from "@/actions/finance";
import { listServices } from "@/actions/attendance";
import { requirePermission } from "@/lib/auth-guard";
import { Card, CardContent } from "@/app/components/ui/card";
import { IncomeEntry } from "./_components/income-entry";

export default async function NewIncomePage({
  searchParams,
}: {
  searchParams: Promise<{ commitmentId?: string }>;
}) {
  await requirePermission("create", "Income");
  const { commitmentId } = await searchParams;
  const [funds, services, commitment] = await Promise.all([
    listFunds(),
    listServices(),
    commitmentId ? getCommitmentForPayment(commitmentId) : null,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Record income</h1>
        <p className="text-sm text-muted-foreground">
          {commitment
            ? `Payment towards ${commitment.fullName}'s pledge for ${commitment.projectTitle}.`
            : "Enter a single gift, or count a whole service collection at once."}
        </p>
      </div>
      <Card>
        <CardContent>
          <IncomeEntry
            funds={funds.filter((f) => f.isActive).map((f) => ({ id: f.id, name: f.name }))}
            services={services.map((s) => ({ id: s.id, title: s.title, date: s.date.toISOString() }))}
            commitment={commitment}
          />
        </CardContent>
      </Card>
    </div>
  );
}
