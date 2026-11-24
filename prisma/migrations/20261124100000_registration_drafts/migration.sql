-- CreateEnum
CREATE TYPE "RegistrationStep" AS ENUM ('ACCOUNT', 'YOU', 'PEOPLE', 'DETAILS', 'REVIEW');

-- CreateTable
CREATE TABLE "event_registration_draft" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" "RegistrationStep" NOT NULL DEFAULT 'ACCOUNT',
    "data" JSONB,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "lastRemindedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_registration_draft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_registration_draft_completedAt_lastActiveAt_idx" ON "event_registration_draft"("completedAt", "lastActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "event_registration_draft_eventId_userId_key" ON "event_registration_draft"("eventId", "userId");

-- AddForeignKey
ALTER TABLE "event_registration_draft" ADD CONSTRAINT "event_registration_draft_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registration_draft" ADD CONSTRAINT "event_registration_draft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

