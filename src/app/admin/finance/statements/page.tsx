import Link from "next/link";
import { prisma } from "@/lib/database";
import { requirePermission } from "@/lib/auth-guard";
import { statementYear } from "@/lib/statements";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/app/components/ui/card";
import { Stat } from "@/app/admin/_components/stat";
import { GiversTable } from "./_components/givers-table";

export default async function StatementsPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requirePermission("read", "Income");
  const thisYear = new Date().getUTCFullYear();
  const year = statementYear((await searchParams).year) ?? thisYear;
  // Same scope as the PDF (giftsForYear): event registration fees aren't gifts.
  const inYear = {
    voidedAt: null,
    eventRegistrationId: null,
    receivedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
  };

  const [byMember, unattributed] = await Promise.all([
    prisma.income.groupBy({
      by: ["memberId"],
      where: { ...inYear, memberId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.income.aggregate({ where: { ...inYear, memberId: null }, _sum: { amount: true }, _count: true }),
  ]);
  const members = await prisma.member.findMany({
    where: { id: { in: byMember.map((r) => r.memberId!) } },
    select: { id: true, fullName: true, household: { select: { id: true, name: true } } },
  });
  const memberById = new Map(members.map((m) => [m.id, m]));
  const rows = byMember
    .map((r) => {
      const m = memberById.get(r.memberId!);
      return m
        ? {
            id: m.id,
            fullName: m.fullName,
            household: m.household,
            gifts: r._count,
            total: r._sum.amount?.toNumber() ?? 0,
          }
        : null;
    })
    .filter((r) => r !== null)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Giving statements</h1>
          <p className="text-sm text-muted-foreground">
            Annual statements for members and households. Members can also download their own from the member portal.
          </p>
        </div>
        <nav className="flex gap-1 rounded-lg border p-1" aria-label="Year">
          {Array.from({ length: 5 }, (_, i) => thisYear - i).map((y) => (
            <Link
              key={y}
              href={`/admin/finance/statements?year=${y}`}
              aria-current={y === year ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1 text-sm tabular-nums",
                y === year ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {y}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={`Givers in ${year}`} value={rows.length.toLocaleString()} />
        <Stat label="Given by members" value={formatMoney(rows.reduce((s, r) => s + r.total, 0))} />
        <Stat
          label={`Not linked to a member (${unattributed._count})`}
          value={formatMoney(unattributed._sum.amount?.toNumber() ?? 0)}
        />
      </div>

      <Card>
        <CardContent>
          <GiversTable rows={rows} year={year} />
        </CardContent>
      </Card>
    </div>
  );
}
