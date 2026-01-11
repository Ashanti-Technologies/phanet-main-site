-- CreateEnum
CREATE TYPE "FundingMode" AS ENUM ('SINGLE_SPONSOR', 'MULTI_CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'DISABLED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "CommitmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'PAYSTACK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetAmount" DECIMAL(12,2) NOT NULL,
    "fundingMode" "FundingMode" NOT NULL DEFAULT 'MULTI_CONTRIBUTOR',
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_image" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_unit_option" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "church_unit_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commitment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "country" TEXT NOT NULL,
    "churchUnit" TEXT,
    "amountCommitted" DECIMAL(12,2) NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" "CommitmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proof_upload" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proof_upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intent" (
    "id" TEXT NOT NULL,
    "commitmentId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GHS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_intent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_image_projectId_idx" ON "project_image"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "church_unit_option_name_key" ON "church_unit_option"("name");

-- CreateIndex
CREATE INDEX "commitment_projectId_idx" ON "commitment"("projectId");

-- CreateIndex
CREATE INDEX "commitment_userId_idx" ON "commitment"("userId");

-- CreateIndex
CREATE INDEX "proof_upload_projectId_idx" ON "proof_upload"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intent_reference_key" ON "payment_intent"("reference");

-- CreateIndex
CREATE INDEX "payment_intent_commitmentId_idx" ON "payment_intent"("commitmentId");

-- CreateIndex
CREATE INDEX "payment_intent_reference_idx" ON "payment_intent"("reference");

-- AddForeignKey
ALTER TABLE "project_image" ADD CONSTRAINT "project_image_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitment" ADD CONSTRAINT "commitment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commitment" ADD CONSTRAINT "commitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_upload" ADD CONSTRAINT "proof_upload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intent" ADD CONSTRAINT "payment_intent_commitmentId_fkey" FOREIGN KEY ("commitmentId") REFERENCES "commitment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
