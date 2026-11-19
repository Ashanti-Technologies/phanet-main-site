import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { listExpenses, listIncome } from "@/actions/finance";
import { toCsv } from "@/lib/reports";
import { parseFinanceRange } from "../_components/range";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export async function GET(req: Request) {
  await requireAdmin();
  await requirePermission("export", "Income");
  const range = parseFinanceRange(Object.fromEntries(new URL(req.url).searchParams));
  const filters = { ...range, includeVoided: true };
  const [incomes, expenses] = await Promise.all([listIncome(filters), listExpenses(filters)]);

  const csv = toCsv([
    ...incomes.map((r) => ({
      type: "income",
      date: iso(r.receivedAt),
      amount: r.amount.toFixed(2),
      fund: r.fund.name,
      category: null,
      method: r.method,
      party: r.member?.fullName ?? r.donorName,
      service: r.service?.title ?? null,
      project: r.commitment?.project.title ?? null,
      reference: r.reference,
      status: r.voidedAt ? "VOIDED" : "RECEIVED",
      void_reason: r.voidReason,
      details: r.note,
      recorded_by: r.recordedBy?.name ?? "Online",
    })),
    ...expenses.map((r) => ({
      type: "expense",
      date: iso(r.incurredAt),
      amount: r.amount.toFixed(2),
      fund: r.fund?.name ?? null,
      category: r.category.name,
      method: r.method,
      party: r.payee,
      service: null,
      project: null,
      reference: r.reference,
      status: r.voidedAt ? "VOIDED" : r.status,
      void_reason: r.voidReason,
      details: r.description,
      recorded_by: r.recordedBy.name,
    })),
  ]);

  const name = `finance-${iso(range.from)}-to-${iso(range.to)}.csv`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
    },
  });
}
