-- CreateTable
CREATE TABLE "household_invite" (
    "id" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "relationship" "AttendeeRelationship" NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "household_invite_toMemberId_idx" ON "household_invite"("toMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "household_invite_fromMemberId_toMemberId_key" ON "household_invite"("fromMemberId", "toMemberId");

-- AddForeignKey
ALTER TABLE "household_invite" ADD CONSTRAINT "household_invite_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_invite" ADD CONSTRAINT "household_invite_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

