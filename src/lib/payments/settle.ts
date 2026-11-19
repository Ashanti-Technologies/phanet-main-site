import { prisma } from "@/lib/database";
import { sendGiftReceipt } from "@/lib/email";
import { syncCommitment, syncRegistrationPayment } from "@/lib/finance-ledger";
import { sendRegistrationConfirmation } from "@/lib/event-registration-email";
import { formatMoney } from "@/lib/format";
import { nextMonthlyCharge } from "@/lib/recurring";
import type { PaymentMethod } from "@/app/generated/prisma/client";
import { getPaymentService } from "./index";

export type SettleResult =
  | { status: "unknown" }
  | {
      status: "pending" | "failed" | "completed";
      amount: number;
      givenTo: string;
      /** Set for monthly gifts: whether the card was saved for renewals. */
      monthly?: { active: boolean; dayOfMonth: number };
    };

const CHANNEL_METHOD: Record<string, PaymentMethod> = {
  card: "CARD",
  mobile_money: "MOMO",
  bank: "BANK_TRANSFER",
  bank_transfer: "BANK_TRANSFER",
};

/**
 * Verify a payment with its provider and, on success, write exactly one Income
 * row. Safe to call any number of times and concurrently (webhook + return
 * page): the status guard and the unique Income.paymentIntentId mean only the
 * first caller records the gift.
 */
export async function settlePaymentIntent(reference: string): Promise<SettleResult> {
  const intent = await prisma.paymentIntent.findUnique({
    where: { reference },
    include: {
      fund: { select: { name: true } },
      commitment: { select: { project: { select: { title: true } } } },
      recurringGift: { select: { status: true, dayOfMonth: true } },
      eventRegistration: { select: { event: { select: { title: true } } } },
    },
  });
  if (!intent) return { status: "unknown" };

  const givenTo = intent.commitment
    ? `${intent.commitment.project.title} (pledge)`
    : intent.eventRegistration
      ? `${intent.eventRegistration.event.title} registration`
      : `${intent.fund?.name ?? "PHANET"}${intent.recurringGift ? " (monthly)" : ""}`;
  const base = { amount: intent.amount.toNumber(), givenTo };
  const monthly = async () => {
    if (!intent.recurringGiftId) return undefined;
    const g = await prisma.recurringGift.findUnique({
      where: { id: intent.recurringGiftId },
      select: { status: true, dayOfMonth: true },
    });
    return g ? { active: g.status === "ACTIVE", dayOfMonth: g.dayOfMonth } : undefined;
  };
  if (intent.status === "COMPLETED") return { status: "completed", ...base, monthly: await monthly() };

  const v = await getPaymentService(intent.provider).verify(reference);
  if (v.status === "pending") return { status: "pending", ...base };

  const expectedMinor = intent.amount.mul(100).toNumber();
  const tampered = v.status === "completed" && (v.amountMinor !== expectedMinor || v.currency !== intent.currency);
  if (v.status === "failed" || tampered) {
    if (tampered) {
      console.error("[payments] amount/currency mismatch", { reference, expectedMinor, got: v.amountMinor, currency: v.currency });
    }
    await prisma.paymentIntent.updateMany({
      where: { id: intent.id, status: { in: ["PENDING", "PROCESSING"] } },
      data: {
        status: "FAILED",
        metadata: tampered ? { mismatch: { amountMinor: v.amountMinor, currency: v.currency } } : undefined,
      },
    });
    return { status: "failed", ...base };
  }

  if (!intent.fundId) throw new Error(`Payment ${reference} has no fund`);
  const receivedAt = v.paidAt ?? new Date();
  const recorded = await prisma.$transaction(async (tx) => {
    const { count } = await tx.paymentIntent.updateMany({
      where: { id: intent.id, status: { not: "COMPLETED" } },
      data: { status: "COMPLETED", metadata: { channel: v.channel ?? null, paidAt: receivedAt.toISOString() } },
    });
    if (count === 0) return false; // someone else settled it first
    await tx.income.create({
      data: {
        fundId: intent.fundId!,
        amount: intent.amount,
        currency: intent.currency,
        receivedAt,
        method: CHANNEL_METHOD[v.channel ?? ""] ?? "OTHER",
        reference,
        memberId: intent.memberId,
        donorName: intent.donorName,
        commitmentId: intent.commitmentId,
        eventRegistrationId: intent.eventRegistrationId,
        paymentIntentId: intent.id,
        note: `Online via ${intent.provider.toLowerCase()}`,
      },
    });
    if (intent.commitmentId) await syncCommitment(tx, intent.commitmentId);
    if (intent.eventRegistrationId) await syncRegistrationPayment(tx, intent.eventRegistrationId);
    if (intent.recurringGiftId) {
      // First payment of a monthly gift: keep the card if Paystack lets us reuse it.
      // (Renewals already had nextChargeAt advanced by the cron before charging.)
      const auth = v.authorization;
      await tx.recurringGift.updateMany({
        where: { id: intent.recurringGiftId, status: "PENDING" },
        data:
          auth?.reusable
            ? {
                status: "ACTIVE",
                authorizationCode: auth.code,
                cardLabel: auth.label || null,
                nextChargeAt: nextMonthlyCharge(receivedAt, intent.recurringGift!.dayOfMonth),
              }
            : { status: "CANCELLED", cancelledAt: new Date() },
      });
      await tx.recurringGift.updateMany({
        where: { id: intent.recurringGiftId, status: "ACTIVE" },
        data: { failedAttempts: 0 },
      });
    }
    return true;
  });

  if (recorded && intent.eventRegistrationId) {
    // Event fee, not a gift: the booking confirmation (with "Paid GH₵…") is the receipt.
    await sendRegistrationConfirmation({ registrationId: intent.eventRegistrationId, updated: false, to: intent.email });
  } else if (recorded && intent.email) {
    await sendGiftReceipt({
      to: intent.email,
      fullName: intent.donorName,
      givenTo,
      amount: formatMoney(intent.amount),
      reference,
      date: receivedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    }).catch((err) => console.error("[payments] receipt email failed", err));
  }
  return { status: "completed", ...base, monthly: await monthly() };
}
