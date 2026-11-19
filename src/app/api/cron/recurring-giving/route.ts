import { NextResponse } from "next/server";
import { prisma } from "@/lib/database";
import { sendMonthlyGiftPaused } from "@/lib/email";
import { formatMoney } from "@/lib/format";
import { generatePaymentReference, getPaymentService } from "@/lib/payments";
import { settlePaymentIntent } from "@/lib/payments/settle";
import { afterFailedCharge, nextMonthlyCharge } from "@/lib/recurring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Daily (Vercel cron): charge monthly gifts that are due against their saved
 * card, then settle each charge like any other gift.
 *
 * Double-charge safety: each gift's nextChargeAt is moved to next month
 * *before* charging, guarded on the value we read, so overlapping runs can't
 * both claim the same month.
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>` header.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await prisma.recurringGift.findMany({
    where: { status: "ACTIVE", nextChargeAt: { lte: now }, authorizationCode: { not: null } },
    include: { fund: { select: { name: true } } },
    orderBy: { nextChargeAt: "asc" },
    // ponytail: 100 per run (one call each); raise or batch if monthly givers outgrow it.
    take: 100,
  });

  const tally = { due: due.length, charged: 0, pending: 0, failed: 0, paused: 0 };
  for (const gift of due) {
    const claimed = await prisma.recurringGift.updateMany({
      where: { id: gift.id, status: "ACTIVE", nextChargeAt: gift.nextChargeAt },
      data: { nextChargeAt: nextMonthlyCharge(now, gift.dayOfMonth) },
    });
    if (claimed.count === 0) continue;

    const service = getPaymentService(gift.provider);
    const reference = generatePaymentReference("PHANET_M");
    await prisma.paymentIntent.create({
      data: {
        provider: gift.provider,
        reference,
        amount: gift.amount,
        currency: gift.currency,
        fundId: gift.fundId,
        memberId: gift.memberId,
        email: gift.email,
        donorName: gift.donorName,
        recurringGiftId: gift.id,
      },
    });

    try {
      if (!service.chargeSavedCard) throw new Error(`${gift.provider} can't charge saved cards`);
      await service.chargeSavedCard({
        authorizationCode: gift.authorizationCode!,
        email: gift.email,
        amountMinor: gift.amount.mul(100).toNumber(),
        currency: gift.currency,
        reference,
      });
      // The charge response isn't trusted on its own — verify like every gift.
      const result = await settlePaymentIntent(reference);
      if (result.status === "completed") {
        tally.charged++;
        continue;
      }
      if (result.status === "pending") {
        tally.pending++; // the webhook settles it later
        continue;
      }
    } catch (err) {
      console.error("[recurring] charge error", gift.id, err);
    }

    tally.failed++;
    const next = afterFailedCharge(gift.failedAttempts, now);
    // Guarded on ACTIVE so a gift cancelled mid-run stays cancelled.
    const updated = await prisma.recurringGift.updateMany({ where: { id: gift.id, status: "ACTIVE" }, data: next });
    if (updated.count && next.status === "PAUSED") {
      tally.paused++;
      await sendMonthlyGiftPaused({
        to: gift.email,
        fullName: gift.donorName,
        amount: formatMoney(gift.amount),
        fund: gift.fund.name,
        giveUrl: `${process.env.BETTER_AUTH_URL ?? "https://phanerosisnetwork.com"}/give`,
      }).catch((err) => console.error("[recurring] paused email failed", err));
    }
  }

  return NextResponse.json({ ok: true, ...tally });
}
