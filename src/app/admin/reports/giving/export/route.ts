import { requirePermission } from "@/lib/auth-guard";
import { getGivingReport, toCsv } from "@/lib/reports";

export async function GET() {
  await requirePermission("export", "Commitment");
  const report = await getGivingReport();
  const csv = toCsv([
    ...report.byProject.map((row) => ({ section: "confirmed_by_project", ...row })),
    {
      section: "summary",
      label: "confirmed_total",
      value: report.confirmedTotal,
    },
    {
      section: "summary",
      label: "completed_payment_intents",
      value: report.paymentIntentTotal,
    },
    {
      section: "summary",
      label: "average_per_active_member",
      value: report.averagePerActiveMember,
    },
  ]);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="giving-report.csv"',
    },
  });
}
