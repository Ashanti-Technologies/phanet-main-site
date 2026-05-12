import { requirePermission } from "@/lib/auth-guard";
import { getDemographicsReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReportBarChart, ReportPieChart } from "../_components/report-charts";
import { MetricCard, ReportHeader } from "../_components/report-shell";

export default async function DemographicsReportPage() {
  await requirePermission("read", "Member");
  const report = await getDemographicsReport();

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Demographics report"
        description="Age, gender, and unit distribution across the directory."
        exportHref="/admin/reports/demographics/export"
      />
      <MetricCard label="Members counted" value={report.totalMembers} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Age brackets</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportBarChart data={report.ageBuckets} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gender split</CardTitle>
          </CardHeader>
          <CardContent>
            <ReportPieChart data={report.genderSplit} />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportBarChart data={report.unitDistribution.slice(0, 12)} />
        </CardContent>
      </Card>
    </div>
  );
}
