import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/database";
import {
  getCurrentMemberForPortal,
  normalizedPhoneVariants,
} from "@/lib/member-portal";
import { CommitmentReceipt } from "@/lib/receipts/CommitmentReceipt";
import { APP_CONFIG } from "@/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildReceiptNumber(commitmentId: string, confirmedAt: Date) {
  const year = confirmedAt.getFullYear();
  const suffix = commitmentId.slice(-8).toUpperCase();
  return `PHANET-${year}-${suffix}`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ commitmentId: string }> },
) {
  const { commitmentId } = await params;
  const { session, member } = await getCurrentMemberForPortal();
  if (!member) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const commitment = await prisma.commitment.findUnique({
    where: { id: commitmentId },
    include: { project: { select: { title: true } } },
  });
  if (!commitment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ownedEmails = new Set(
    [member.email, session.user.email]
      .filter(Boolean)
      .map((e) => String(e).toLowerCase()),
  );
  const ownedPhones = new Set(normalizedPhoneVariants(member.phone));
  const matchesEmail = ownedEmails.has(commitment.email.toLowerCase());
  const matchesPhone =
    commitment.phone && ownedPhones.has(commitment.phone);
  if (!matchesEmail && !matchesPhone) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (commitment.status !== "CONFIRMED") {
    return NextResponse.json(
      { error: "Receipt is only available for confirmed commitments." },
      { status: 409 },
    );
  }

  const confirmedAt = commitment.confirmedAt ?? commitment.updatedAt;
  const receiptNumber = buildReceiptNumber(commitment.id, confirmedAt);
  const amount = Number(commitment.confirmedAmount ?? commitment.amountCommitted);
  const logoUrl = `${APP_CONFIG.siteUrl}/images/logo.png`;

  const buffer = await renderToBuffer(
    CommitmentReceipt({
      receiptNumber,
      issuedAt: new Date(),
      member: {
        fullName: commitment.fullName || member.fullName,
        email: commitment.email,
      },
      project: { title: commitment.project.title },
      amount,
      currency: "GHS",
      confirmedAt,
      logoUrl,
    }),
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="phanet-receipt-${receiptNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
