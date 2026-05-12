-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PASTORAL', 'GENERAL');

-- CreateEnum
CREATE TYPE "FollowUpTaskStatus" AS ENUM ('OPEN', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventRsvpStatus" AS ENUM ('GOING', 'CANCELLED');

-- AlterTable
ALTER TABLE "prayer_request" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "visitation" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "visitedById" TEXT NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_task" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "FollowUpTaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_up_task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_note" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_invite" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_rsvp" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" "EventRsvpStatus" NOT NULL DEFAULT 'GOING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitation_memberId_visitedAt_idx" ON "visitation"("memberId", "visitedAt");

-- CreateIndex
CREATE INDEX "visitation_visitedById_idx" ON "visitation"("visitedById");

-- CreateIndex
CREATE INDEX "follow_up_task_memberId_idx" ON "follow_up_task"("memberId");

-- CreateIndex
CREATE INDEX "follow_up_task_assignedToId_status_dueAt_idx" ON "follow_up_task"("assignedToId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "follow_up_task_createdById_idx" ON "follow_up_task"("createdById");

-- CreateIndex
CREATE INDEX "member_note_memberId_visibility_idx" ON "member_note"("memberId", "visibility");

-- CreateIndex
CREATE INDEX "member_note_authorId_idx" ON "member_note"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "member_invite_memberId_key" ON "member_invite"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "member_invite_tokenHash_key" ON "member_invite"("tokenHash");

-- CreateIndex
CREATE INDEX "member_invite_email_idx" ON "member_invite"("email");

-- CreateIndex
CREATE INDEX "member_invite_expiresAt_idx" ON "member_invite"("expiresAt");

-- CreateIndex
CREATE INDEX "event_rsvp_eventId_status_idx" ON "event_rsvp"("eventId", "status");

-- CreateIndex
CREATE INDEX "event_rsvp_memberId_status_idx" ON "event_rsvp"("memberId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvp_memberId_eventId_key" ON "event_rsvp"("memberId", "eventId");

-- CreateIndex
CREATE INDEX "prayer_request_email_idx" ON "prayer_request"("email");

-- CreateIndex
CREATE INDEX "prayer_request_phone_idx" ON "prayer_request"("phone");

-- AddForeignKey
ALTER TABLE "visitation" ADD CONSTRAINT "visitation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitation" ADD CONSTRAINT "visitation_visitedById_fkey" FOREIGN KEY ("visitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_task" ADD CONSTRAINT "follow_up_task_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_task" ADD CONSTRAINT "follow_up_task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_task" ADD CONSTRAINT "follow_up_task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_note" ADD CONSTRAINT "member_note_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_note" ADD CONSTRAINT "member_note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_invite" ADD CONSTRAINT "member_invite_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_invite" ADD CONSTRAINT "member_invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_rsvp" ADD CONSTRAINT "event_rsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

