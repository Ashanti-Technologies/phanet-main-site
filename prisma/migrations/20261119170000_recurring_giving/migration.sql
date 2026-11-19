-- Recurring (monthly) card gifts charged from a saved Paystack authorization.
-- CreateEnum
CREATE TYPE "RecurringGiftStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "payment_intent" ADD COLUMN     "recurringGiftId" TEXT;

-- CreateTable
CREATE TABLE "recurring_gift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberId" TEXT,
    "fundId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "email" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "authorizationCode" TEXT,
    "cardLabel" TEXT,
    "dayOfMonth" INTEGER NOT NULL,
    "nextChargeAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "status" "RecurringGiftStatus" NOT NULL DEFAULT 'PENDING',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_gift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_gift_status_nextChargeAt_idx" ON "recurring_gift"("status", "nextChargeAt");

-- CreateIndex
CREATE INDEX "recurring_gift_userId_idx" ON "recurring_gift"("userId");

-- CreateIndex
CREATE INDEX "payment_intent_recurringGiftId_idx" ON "payment_intent"("recurringGiftId");

-- AddForeignKey
ALTER TABLE "payment_intent" ADD CONSTRAINT "payment_intent_recurringGiftId_fkey" FOREIGN KEY ("recurringGiftId") REFERENCES "recurring_gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_gift" ADD CONSTRAINT "recurring_gift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_gift" ADD CONSTRAINT "recurring_gift_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_gift" ADD CONSTRAINT "recurring_gift_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

