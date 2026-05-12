-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('VISITOR', 'PENDING_APPROVAL', 'REGULAR', 'MEMBER', 'INACTIVE', 'TRANSFERRED', 'DECEASED');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "preferredName" TEXT,
    "dob" TIMESTAMP(3),
    "gender" "Gender",
    "maritalStatus" "MaritalStatus",
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT DEFAULT 'Ghana',
    "occupation" TEXT,
    "photoUrl" TEXT,
    "photoPublicId" TEXT,
    "salvationDate" TIMESTAMP(3),
    "baptismDate" TIMESTAMP(3),
    "weddingAnniversary" TIMESTAMP(3),
    "joinDate" TIMESTAMP(3),
    "status" "MemberStatus" NOT NULL DEFAULT 'VISITOR',
    "notes" TEXT,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyBySms" BOOLEAN NOT NULL DEFAULT true,
    "householdId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_unit" (
    "memberId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "role" "UnitRole" NOT NULL DEFAULT 'MEMBER',
    "since" TIMESTAMP(3),

    CONSTRAINT "member_unit_pkey" PRIMARY KEY ("memberId","unitId")
);

-- CreateTable
CREATE TABLE "household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine" TEXT,
    "city" TEXT,
    "region" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_tag" (
    "memberId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "member_tag_pkey" PRIMARY KEY ("memberId","tagId")
);

-- CreateTable
CREATE TABLE "import_job" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "total" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_userId_key" ON "member"("userId");

-- CreateIndex
CREATE INDEX "member_email_idx" ON "member"("email");

-- CreateIndex
CREATE INDEX "member_phone_idx" ON "member"("phone");

-- CreateIndex
CREATE INDEX "member_status_idx" ON "member"("status");

-- CreateIndex
CREATE INDEX "member_dob_idx" ON "member"("dob");

-- CreateIndex
CREATE INDEX "member_householdId_idx" ON "member"("householdId");

-- CreateIndex
CREATE INDEX "member_unit_unitId_idx" ON "member_unit"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "tag_label_key" ON "tag"("label");

-- CreateIndex
CREATE INDEX "member_tag_tagId_idx" ON "member_tag"("tagId");

-- CreateIndex
CREATE INDEX "import_job_createdById_idx" ON "import_job"("createdById");

-- CreateIndex
CREATE INDEX "import_job_status_idx" ON "import_job"("status");

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_unit" ADD CONSTRAINT "member_unit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_unit" ADD CONSTRAINT "member_unit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "church_unit_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_tag" ADD CONSTRAINT "member_tag_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_tag" ADD CONSTRAINT "member_tag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_job" ADD CONSTRAINT "import_job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

