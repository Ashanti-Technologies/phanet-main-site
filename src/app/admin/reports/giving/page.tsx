import { requirePermission } from "@/lib/auth-guard";
import { getGivingReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReportBarChart } from "../_components/report-charts";
import { MetricCard, ReportHeader } from "../_components/report-shell";

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
        <MetricCard
          label="Confirmed commitments"
          value={`GH₵ ${report.confirmedTotal.toLocaleString()}`}
        />
        <MetricCard
          label="Completed payment intents"
          value={`GH₵ ${report.paymentIntentTotal.toLocaleString()}`}
        />
        <MetricCard
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
