"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/database";
import { getSessionOrNull, requireAuth } from "@/lib/auth-guard";
import { PROJECTS_FUND_ID } from "@/lib/finance-ledger";
// Shared with event-fee payments; CheckoutError is the "show this message" error.
import { checkout, CheckoutError as GivingError } from "@/lib/payments/checkout";
import { giveSchema, type GiveInput } from "@/lib/schemas/finance.schema";
import { giftDay } from "@/lib/recurring";


type Result = { ok: true; redirectUrl: string } | { ok: false; error: string };

/** Next masks thrown messages in production, so expected errors are returned. */
async function asResult(fn: () => Promise<{ redirectUrl: string }>): Promise<Result> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    if (err instanceof ZodError) return { ok: false, error: err.issues[0]?.message ?? "Check the form" };
    if (err instanceof GivingError) return { ok: false, error: err.message };
    throw err;
  }
}

async function sessionMemberId() {
  const session = await getSessionOrNull();
  if (!session?.user) return null;
  const member = await prisma.member.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  return member?.id ?? null;
}

// ponytail: public and unauthenticated — each call only creates a PENDING intent; add rate limiting if it gets abused.
export async function startGiving(input: GiveInput): Promise<Result> {
  return asResult(async () => {
    const data = giveSchema.parse(input);
    const fund = await prisma.fund.findFirst({
      where: { id: data.fundId, isActive: true },
      select: { id: true },
    });
    if (!fund) throw new GivingError("That fund isn't accepting gifts right now");
    return checkout({
      amount: new Prisma.Decimal(data.amount),
      fundId: fund.id,
      email: data.email,
      donorName: data.fullName,
      memberId: await sessionMemberId(),
    });
  });
}

/**
 * Monthly gift: the first month goes through checkout (card only — Mobile
 * Money can't be charged again later); renewals are charged by the cron.
 * Signed-in givers only, so they can see and cancel it in their portal.
 */
export async function startMonthlyGiving(input: GiveInput): Promise<Result> {
  return asResult(async () => {
    const session = await getSessionOrNull();
    if (!session?.user) throw new GivingError("Please sign in to set up a monthly gift.");
    const data = giveSchema.parse(input);
    const fund = await prisma.fund.findFirst({
      where: { id: data.fundId, isActive: true },
      select: { id: true },
    });
    if (!fund) throw new GivingError("That fund isn't accepting gifts right now");
    const amount = new Prisma.Decimal(data.amount);
    const memberId = await sessionMemberId();
    const gift = await prisma.recurringGift.create({
      data: {
        userId: session.user.id,
        memberId,
        fundId: fund.id,
        amount,
        email: data.email,
        donorName: data.fullName,
        dayOfMonth: giftDay(new Date()),
      },
    });
    return checkout({
      amount,
      fundId: fund.id,
      email: data.email,
      donorName: data.fullName,
      memberId,
      recurringGiftId: gift.id,
      channels: ["card"],
    });
  });
}

/** Stop one of your own monthly gifts. Past gifts stay in the ledger. */
export async function cancelMyRecurringGift(id: string) {
  const session = await requireAuth();
  const { count } = await prisma.recurringGift.updateMany({
    where: { id, userId: session.user.id, status: { in: ["PENDING", "ACTIVE", "PAUSED"] } },
    // Drop the saved card token — nothing can charge it after this.
    data: { status: "CANCELLED", cancelledAt: new Date(), nextChargeAt: null, authorizationCode: null },
  });
  if (count === 0) throw new Error("Monthly gift not found");
  revalidatePath("/me/giving");
  return { success: true };
}

/** Pay the outstanding balance of your own pledge. */
export async function startPledgePayment(commitmentId: string): Promise<Result> {
  const session = await requireAuth();
  return asResult(async () => {
    const commitment = await prisma.commitment.findUnique({
      where: { id: commitmentId },
      select: { id: true, userId: true, fullName: true, email: true, status: true, amountCommitted: true },
    });
    if (!commitment || commitment.userId !== session.user.id) throw new GivingError("Pledge not found");
    if (commitment.status === "CANCELLED") throw new GivingError("This pledge was cancelled");

    const paid = await prisma.income.aggregate({
      where: { commitmentId, voidedAt: null },
      _sum: { amount: true },
    });
    const remaining = commitment.amountCommitted.sub(paid._sum.amount ?? 0);
    if (remaining.lte(0)) throw new GivingError("This pledge is already fully paid — thank you!");

    return checkout({
      amount: remaining,
      fundId: PROJECTS_FUND_ID,
      email: commitment.email,
      // The ledger is internal; pledge anonymity only applies to the public wall.
      donorName: commitment.fullName,
      memberId: await sessionMemberId(),
      commitmentId,
    });
  });
}
