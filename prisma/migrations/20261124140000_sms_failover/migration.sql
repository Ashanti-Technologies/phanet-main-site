-- AlterTable
ALTER TABLE "message_log" ADD COLUMN "provider" TEXT;

-- CreateIndex
CREATE INDEX "message_log_providerRef_idx" ON "message_log"("providerRef");

-- CreateTable
CREATE TABLE "integration_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_setting_pkey" PRIMARY KEY ("key")
);
