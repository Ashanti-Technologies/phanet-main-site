import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { requireAdmin, requirePermission } from "@/lib/auth-guard";
import { statementResponse, statementYear } from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ?year=2026&memberId=… or ?year=2026&householdId=… */
export async function GET(req: Request) {
  await requireAdmin();
  await requirePermission("read", "Income");
  const q = new URL(req.url).searchParams;
  const year = statementYear(q.get("year"));
  if (!year) return NextResponse.json({ error: "invalid_year" }, { status: 400 });

  const householdId = q.get("householdId");
  if (householdId) {
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      select: { id: true, name: true, members: { select: { id: true, fullName: true }, orderBy: { fullName: "asc" } } },
    });
    if (!household) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return statementResponse({ year, recipient: household.name, members: household.members, ownerId: household.id });
  }

  const memberId = q.get("memberId");
  const member = memberId
    ? await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, fullName: true } })
    : null;
  if (!member) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return statementResponse({ year, recipient: member.fullName, members: [member], ownerId: member.id });
}
