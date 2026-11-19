import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { APP_CONFIG } from "@/constants";
import { prisma } from "@/lib/database";
import { summarizeLedger } from "@/lib/finance-summary";
import { GivingStatement } from "@/lib/receipts/GivingStatement";
import { PAYMENT_METHOD_LABELS } from "@/lib/schemas/finance.schema";

/** Parse a statement year from a URL; null when out of a sane range. */
export function statementYear(raw: string | null | undefined) {
  const y = Number(raw);
  const now = new Date().getUTCFullYear();
  return Number.isInteger(y) && y >= 2000 && y <= now ? y : null;
}

/** Non-voided gifts by these members in a calendar year (UTC). */
export function giftsForYear(memberIds: string[], year: number) {
  return prisma.income.findMany({
    where: {
      memberId: { in: memberIds },
      voidedAt: null,
      // Event registration fees are payments for a service, not gifts.
      eventRegistrationId: null,
      receivedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
    },
    select: {
      id: true,
      amount: true,
      receivedAt: true,
      method: true,
      reference: true,
      voidedAt: true,
      fund: { select: { name: true } },
      member: { select: { fullName: true } },
    },
    orderBy: { receivedAt: "asc" },
  });
}

/** Render a member's or household's annual statement as a PDF download. */
export async function statementResponse(opts: {
  year: number;
  recipient: string;
  members: { id: string; fullName: string }[];
  /** Stable id for the statement number (member or household id). */
  ownerId: string;
}) {
  const gifts = await giftsForYear(
    opts.members.map((m) => m.id),
    opts.year,
  );
  const summary = summarizeLedger(
    gifts.map((g) => ({ ...g, fund: g.fund.name })),
    [],
  );
  const statementNo = `PHANET-ST-${opts.year}-${opts.ownerId.slice(-8).toUpperCase()}`;

  const buffer = await renderToBuffer(
    GivingStatement({
      year: opts.year,
      recipient: opts.recipient,
      members: opts.members.map((m) => m.fullName),
      gifts: gifts.map((g) => ({
        date: g.receivedAt,
        giver: g.member?.fullName ?? "",
        fund: g.fund.name,
        method: PAYMENT_METHOD_LABELS[g.method],
        amount: g.amount.toNumber(),
      })),
      byFund: summary.byFund,
      total: summary.incomeTotal,
      statementNo,
      issuedAt: new Date(),
      logoUrl: `${APP_CONFIG.siteUrl}/images/logo.png`,
    }),
  );

  const slug = opts.recipient.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "statement";
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="phanet-giving-${opts.year}-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
