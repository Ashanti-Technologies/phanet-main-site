import { requirePermission } from "@/lib/auth-guard";
import { getGrowthReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReportLineChart } from "../_components/report-charts";
import { MetricCard, ReportHeader } from "../_components/report-shell";

export default async function GrowthReportPage() {
  await requirePermission("read", "Member");
  const report = await getGrowthReport();

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Growth report"
        description="New members added by month."
        exportHref="/admin/reports/growth/export"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard label="New members" value={report.totalNew} />
        <MetricCard label="Active new members" value={report.activeNew} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly growth</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportLineChart data={report.monthly} />
        </CardContent>
      </Card>
    </div>
  );
}
