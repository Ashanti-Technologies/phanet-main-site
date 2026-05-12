import { requirePermission } from "@/lib/auth-guard";
import { getGrowthReport, toCsv } from "@/lib/reports";

export async function GET() {
  await requirePermission("export", "Member");
  const report = await getGrowthReport();
  const csv = toCsv(report.monthly);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="growth-report.csv"',
    },
  });
}
