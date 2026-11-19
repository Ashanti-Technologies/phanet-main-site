import { requirePermission } from "@/lib/auth-guard";
import { getGivingReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReportBarChart } from "../_components/report-charts";
import { ReportHeader } from "../_components/report-shell";
import { Stat } from "@/app/admin/_components/stat";

export default async function GivingReportPage() {
  await requirePermission("read", "Commitment");
  const report = await getGivingReport();

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Giving report"
        description="Confirmed commitments and completed payment-intent totals."
        exportHref="/admin/reports/giving/export"
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat
          label="Confirmed commitments"
          value={`GH₵ ${report.confirmedTotal.toLocaleString()}`}
        />
        <Stat
          label="Completed payment intents"
          value={`GH₵ ${report.paymentIntentTotal.toLocaleString()}`}
        />
        <Stat
          label="Average per active member"
          value={`GH₵ ${Math.round(report.averagePerActiveMember).toLocaleString()}`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Confirmed giving by project</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportBarChart data={report.byProject} />
        </CardContent>
      </Card>
    </div>
  );
}
