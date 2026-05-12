import { requirePermission } from "@/lib/auth-guard";
import { getDemographicsReport, toCsv } from "@/lib/reports";

export async function GET() {
  await requirePermission("export", "Member");
  const report = await getDemographicsReport();
  const csv = toCsv([
    ...report.ageBuckets.map((row) => ({ section: "age", ...row })),
    ...report.genderSplit.map((row) => ({ section: "gender", ...row })),
    ...report.unitDistribution.map((row) => ({ section: "unit", ...row })),
  ]);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="demographics-report.csv"',
    },
  });
}
