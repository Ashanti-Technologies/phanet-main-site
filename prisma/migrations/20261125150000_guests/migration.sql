-- CreateEnum
CREATE TYPE "HeardFrom" AS ENUM ('FRIEND_FAMILY', 'SOCIAL_MEDIA', 'YOUTUBE', 'CHURCH', 'CAMPUS', 'EVENT', 'SEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('DEPARTMENT', 'CHAPTER');

-- AlterTable
ALTER TABLE "church_unit_option" ADD COLUMN     "kind" "UnitKind" NOT NULL DEFAULT 'DEPARTMENT';

-- CreateTable
CREATE TABLE "guest" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "unitId" TEXT,
    "heardFrom" "HeardFrom" NOT NULL,
    "heardFromOther" TEXT,
    "plannedFor" TIMESTAMP(3) NOT NULL,
    "remindedAt" TIMESTAMP(3),
    "followUpTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_followUpTaskId_key" ON "guest"("followUpTaskId");

-- CreateIndex
CREATE INDEX "guest_unitId_createdAt_idx" ON "guest"("unitId", "createdAt");

-- CreateIndex
CREATE INDEX "guest_plannedFor_remindedAt_idx" ON "guest"("plannedFor", "remindedAt");

-- CreateIndex
CREATE INDEX "guest_memberId_idx" ON "guest"("memberId");

-- AddForeignKey
ALTER TABLE "guest" ADD CONSTRAINT "guest_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest" ADD CONSTRAINT "guest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "church_unit_option"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest" ADD CONSTRAINT "guest_followUpTaskId_fkey" FOREIGN KEY ("followUpTaskId") REFERENCES "follow_up_task"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Regional chapters become units (from PhanetRegionalChapter). Guests on
-- /new-here pick one; unit-limited admin access scopes each chapter's team.
INSERT INTO "church_unit_option" ("id", "name", "kind", "isActive", "order", "createdAt") VALUES
  ('cphanetchapter01greateraccra', 'Greater Accra Chapter', 'CHAPTER', true, 101, CURRENT_TIMESTAMP),
  ('cphanetchapter02ashanti', 'Ashanti Chapter', 'CHAPTER', true, 102, CURRENT_TIMESTAMP),
  ('cphanetchapter03centralnorth', 'Central North Chapter', 'CHAPTER', true, 103, CURRENT_TIMESTAMP),
  ('cphanetchapter04centralsouth', 'Central South Chapter', 'CHAPTER', true, 104, CURRENT_TIMESTAMP),
  ('cphanetchapter05eastern', 'Eastern Chapter', 'CHAPTER', true, 105, CURRENT_TIMESTAMP),
  ('cphanetchapter06western', 'Western Chapter', 'CHAPTER', true, 106, CURRENT_TIMESTAMP),
  ('cphanetchapter07bono', 'Bono Chapter', 'CHAPTER', true, 107, CURRENT_TIMESTAMP),
  ('cphanetchapter08northern', 'Northern Chapter', 'CHAPTER', true, 108, CURRENT_TIMESTAMP),
  ('cphanetchapter09northeast', 'North East Chapter', 'CHAPTER', true, 109, CURRENT_TIMESTAMP),
  ('cphanetchapter10diaspora', 'Diaspora Chapter', 'CHAPTER', true, 110, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
