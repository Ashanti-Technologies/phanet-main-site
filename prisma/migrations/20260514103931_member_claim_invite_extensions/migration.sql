-- CreateEnum
CREATE TYPE "MemberInviteChannel" AS ENUM ('EMAIL', 'PHONE');

-- AlterTable
ALTER TABLE "country" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "member_invite" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "channel" "MemberInviteChannel" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "codeHash" TEXT,
ADD COLUMN     "lastSentAt" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "member_phanet_profile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "region" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "member_invite_phone_idx" ON "member_invite"("phone");
