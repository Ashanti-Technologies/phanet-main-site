import { NextResponse } from "next/server";
import { getCurrentMemberForPortal } from "@/lib/member-portal";
import { statementResponse, statementYear } from "@/lib/statements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A signed-in member's own giving statement for one calendar year. */
export async function GET(_req: Request, { params }: { params: Promise<{ year: string }> }) {
  const year = statementYear((await params).year);
  if (!year) return NextResponse.json({ error: "invalid_year" }, { status: 400 });
  const { member } = await getCurrentMemberForPortal();
  if (!member) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return statementResponse({
    year,
    recipient: member.fullName,
    members: [{ id: member.id, fullName: member.fullName }],
    ownerId: member.id,
  });
}
