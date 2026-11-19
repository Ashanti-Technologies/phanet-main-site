-- Event fees: admin-defined price tiers, per-event payment mode, booking amounts linked to the ledger.
-- CreateEnum
CREATE TYPE "EventPaymentMode" AS ENUM ('FREE', 'DISPLAY_ONLY', 'PAY_AT_EVENT', 'ONLINE');

-- AlterEnum
ALTER TYPE "EventRegistrationStatus" ADD VALUE 'PENDING_PAYMENT';

-- AlterTable
ALTER TABLE "payment_intent" ADD COLUMN     "eventRegistrationId" TEXT;

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "eventRegistrationId" TEXT;

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "feeFundId" TEXT,
ADD COLUMN     "paymentMode" "EventPaymentMode" NOT NULL DEFAULT 'FREE';

-- AlterTable
ALTER TABLE "event_registration" ADD COLUMN     "amountDue" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "event_attendee" ADD COLUMN     "amount" DECIMAL(12,2),
ADD COLUMN     "priceTierId" TEXT,
ADD COLUMN     "tierName" TEXT;

-- CreateTable
CREATE TABLE "event_price_tier" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_price_tier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_price_tier_eventId_name_key" ON "event_price_tier"("eventId", "name");

-- CreateIndex
CREATE INDEX "payment_intent_eventRegistrationId_idx" ON "payment_intent"("eventRegistrationId");

-- CreateIndex
CREATE INDEX "income_eventRegistrationId_idx" ON "income"("eventRegistrationId");

-- AddForeignKey
ALTER TABLE "payment_intent" ADD CONSTRAINT "payment_intent_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "event_registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "event_registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_feeFundId_fkey" FOREIGN KEY ("feeFundId") REFERENCES "fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_price_tier" ADD CONSTRAINT "event_price_tier_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "event_price_tier"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Default fund for event fees (admins can pick another per event).
INSERT INTO "fund" ("id", "name", "description") VALUES
  ('fund_events', 'Events', 'Event registration fees')
ON CONFLICT ("name") DO NOTHING;
