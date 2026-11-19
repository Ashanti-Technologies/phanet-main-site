import { Prisma } from "@/app/generated/prisma/client";
import { tagRegistrationAttendees } from "@/lib/event-registration";

/** Seeded by the finance_ledger migration; renaming the fund keeps this id. */
export const PROJECTS_FUND_ID = "fund_projects";

/**
 * A pledge's confirmed amount is the sum of its non-voided payments. Records
 * that were confirmed by hand before the ledger existed (no linked income) are
 * left untouched.
 */
export async function syncCommitment(tx: Prisma.TransactionClient, commitmentId: string) {
  const linked = await tx.income.count({ where: { commitmentId } });
  if (linked === 0) return;
  const paid = await tx.income.aggregate({
    where: { commitmentId, voidedAt: null },
    _sum: { amount: true },
    _max: { receivedAt: true },
  });
  const sum = paid._sum.amount;
  await tx.commitment.update({
    where: { id: commitmentId },
    data:
      sum && sum.gt(0)
        ? { confirmedAmount: sum, confirmedAt: paid._max.receivedAt, status: "CONFIRMED" }
        : { confirmedAmount: null, confirmedAt: null },
  });
}

/**
 * An event booking's paid amount is the sum of its non-voided payments.
 * A booking held for online payment is confirmed (and its people tagged) once
 * fully paid. Voiding a payment un-pays the booking but never un-confirms it.
 */
export async function syncRegistrationPayment(
  tx: Prisma.TransactionClient,
  registrationId: string,
): Promise<{ confirmedNow: boolean }> {
  const reg = await tx.eventRegistration.findUnique({
    where: { id: registrationId },
    select: { amountDue: true, status: true },
  });
  if (!reg) return { confirmedNow: false };
  const paid = await tx.income.aggregate({
    where: { eventRegistrationId: registrationId, voidedAt: null },
    _sum: { amount: true },
    _max: { receivedAt: true },
  });
  const amountPaid = paid._sum.amount ?? new Prisma.Decimal(0);
  const fullyPaid = amountPaid.gt(0) && amountPaid.gte(reg.amountDue);
  const confirmedNow = reg.status === "PENDING_PAYMENT" && amountPaid.gte(reg.amountDue);
  await tx.eventRegistration.update({
    where: { id: registrationId },
    data: {
      amountPaid,
      paidAt: fullyPaid ? (paid._max.receivedAt ?? new Date()) : null,
      ...(confirmedNow ? { status: "CONFIRMED" as const } : {}),
    },
  });
  if (confirmedNow) await tagRegistrationAttendees(tx, [registrationId]);
  return { confirmedNow };
}
