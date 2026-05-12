import { requirePermission } from "@/lib/auth-guard";
import { getEngagementReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReportBarChart } from "../_components/report-charts";
import { MetricCard, ReportHeader } from "../_components/report-shell";

export default async function EngagementReportPage() {
  await requirePermission("read", "Attendance");
  const report = await getEngagementReport();

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Engagement report"
        description="Attendance averages and recent retention."
        exportHref="/admin/reports/engagement/export"
      />
      <MetricCard
        label="Average attendance"
        value={Math.round(report.averageAttendance).toLocaleString()}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance by service</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportBarChart data={report.serviceAttendance.slice(-12)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retention</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportBarChart data={report.retention} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
