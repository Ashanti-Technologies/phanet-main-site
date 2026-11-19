-- Online giving: payment intents without a pledge; provider-settled income has no recorder.
-- AlterTable
ALTER TABLE "payment_intent" ADD COLUMN     "donorName" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "fundId" TEXT,
ADD COLUMN     "memberId" TEXT,
ALTER COLUMN "commitmentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "income" ALTER COLUMN "recordedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "payment_intent" ADD CONSTRAINT "payment_intent_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "fund"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intent" ADD CONSTRAINT "payment_intent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

