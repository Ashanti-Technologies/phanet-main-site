-- CreateEnum
CREATE TYPE "PhanetLifeStage" AS ENUM ('WORKING_PROFESSIONAL', 'TERTIARY_STUDENT', 'SHS_STUDENT');

-- CreateEnum
CREATE TYPE "PhanetProfessionalTrack" AS ENUM ('EMPLOYED', 'SELF_EMPLOYED', 'STUDYING_OVERSEAS');

-- CreateEnum
CREATE TYPE "PhanetRegionalChapter" AS ENUM ('GREATER_ACCRA', 'ASHANTI', 'DIASPORA', 'NORTHERN', 'CENTRAL_NORTH', 'CENTRAL_SOUTH', 'NORTH_EAST', 'BONO', 'EASTERN', 'WESTERN');

-- CreateEnum
CREATE TYPE "PhanetChapterRole" AS ENUM ('EXECUTIVE_MEMBER', 'NON_EXECUTIVE_MEMBER');

-- CreateTable
CREATE TABLE "country" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dialCode" TEXT,
    "currency" TEXT,
    "translations" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_phanet_profile" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "formSubmittedAt" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "lifeStage" "PhanetLifeStage",
    "professionalTrack" "PhanetProfessionalTrack",
    "organizationName" TEXT,
    "regionalChapter" "PhanetRegionalChapter",
    "tertiaryInstitution" TEXT,
    "tertiaryProgramme" TEXT,
    "tertiaryYear" TEXT,
    "tertiaryResidence" TEXT,
    "tertiaryChapterRole" "PhanetChapterRole",
    "tertiaryExecutiveRole" TEXT,
    "campusMinistryInvolvement" TEXT,
    "shsName" TEXT,
    "shsYear" TEXT,
    "shsProgramme" TEXT,
    "shsChapterRole" "PhanetChapterRole",
    "shsExecutiveRole" TEXT,
    "departmentText" TEXT,
    "nationalRole" TEXT,
    "overseasProgramme" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_phanet_profile_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "member" ADD COLUMN "countryId" TEXT;
ALTER TABLE "member" ADD COLUMN "regionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "country_code_key" ON "country"("code");

-- CreateIndex
CREATE INDEX "country_name_idx" ON "country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "region_countryId_name_key" ON "region"("countryId", "name");

-- CreateIndex
CREATE INDEX "region_countryId_idx" ON "region"("countryId");

-- CreateIndex
CREATE INDEX "region_name_idx" ON "region"("name");

-- CreateIndex
CREATE UNIQUE INDEX "member_phanet_profile_memberId_key" ON "member_phanet_profile"("memberId");

-- CreateIndex
CREATE INDEX "member_phanet_profile_lifeStage_idx" ON "member_phanet_profile"("lifeStage");

-- CreateIndex
CREATE INDEX "member_phanet_profile_professionalTrack_idx" ON "member_phanet_profile"("professionalTrack");

-- CreateIndex
CREATE INDEX "member_phanet_profile_regionalChapter_idx" ON "member_phanet_profile"("regionalChapter");

-- CreateIndex
CREATE INDEX "member_countryId_idx" ON "member"("countryId");

-- CreateIndex
CREATE INDEX "member_regionId_idx" ON "member"("regionId");

-- AddForeignKey
ALTER TABLE "region" ADD CONSTRAINT "region_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_phanet_profile" ADD CONSTRAINT "member_phanet_profile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
