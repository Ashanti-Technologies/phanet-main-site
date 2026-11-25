import { requirePermission } from "@/lib/auth-guard";
import { getDemographicsReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { ReportBarChart, ReportPieChart } from "../_components/report-charts";
import { ReportHeader } from "../_components/report-shell";
import { Stat } from "@/app/admin/_components/stat";

export default async function DemographicsReportPage() {
  await requirePermission("read", "Report");
  const report = await getDemographicsReport();

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Demographics report"
        description="Age, gender, unit distribution, and how new guests heard about us."
        exportHref="/admin/reports/demographics/export"
      />
      <Stat label="Members counted" value={report.totalMembers} />
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How new guests heard about PHANET</CardTitle>
        </CardHeader>
        <CardContent>
          {report.heardFrom.length ? (
            <ReportBarChart data={report.heardFrom} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No guest sign-ups yet. They come from the New Here page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
