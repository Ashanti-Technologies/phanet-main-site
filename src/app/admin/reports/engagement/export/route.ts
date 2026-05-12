import { requirePermission } from "@/lib/auth-guard";
import { getEngagementReport, toCsv } from "@/lib/reports";

export async function GET() {
  await requirePermission("export", "Attendance");
  const report = await getEngagementReport();
  const csv = toCsv([
    ...report.serviceAttendance.map((row) => ({
      section: "service_attendance",
      label: row.label,
      value: row.value,
    })),
    ...report.retention.map((row) => ({ section: "retention", ...row })),
  ]);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="engagement-report.csv"',
    },
  });
}
