-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PrayerRequestStatus" AS ENUM ('NEW', 'IN_PRAYER', 'PRAYED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "commitment"
ADD COLUMN "paymentNote" TEXT,
ADD COLUMN "confirmedAmount" DECIMAL(12,2),
ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "internalNote" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "prayer_request" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "name" TEXT,
    "status" "PrayerRequestStatus" NOT NULL DEFAULT 'NEW',
    "adminNote" TEXT,
    "prayedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prayer_request_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "prayer_request"
ADD COLUMN IF NOT EXISTS "status" "PrayerRequestStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN IF NOT EXISTS "adminNote" TEXT,
ADD COLUMN IF NOT EXISTS "prayedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT NOT NULL,
    "bodyJson" JSONB,
    "bodyHtml" TEXT NOT NULL,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "registrationUrl" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "imageAlt" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "bodyJson" JSONB,
    "bodyHtml" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "imageAlt" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_section" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "eyebrow" TEXT,
    "title" TEXT NOT NULL,
    "bodyJson" JSONB,
    "bodyHtml" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "imageAlt" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "caption" TEXT,
    "ownerType" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sermon_feature" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sermon_feature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_slug_key" ON "event"("slug");

-- CreateIndex
CREATE INDEX "event_status_date_idx" ON "event"("status", "date");

-- CreateIndex
CREATE INDEX "event_category_idx" ON "event"("category");

-- CreateIndex
CREATE UNIQUE INDEX "content_page_slug_key" ON "content_page"("slug");

-- CreateIndex
CREATE INDEX "content_page_status_idx" ON "content_page"("status");

-- CreateIndex
CREATE UNIQUE INDEX "homepage_section_key_key" ON "homepage_section"("key");

-- CreateIndex
CREATE INDEX "homepage_section_status_order_idx" ON "homepage_section"("status", "order");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_publicId_key" ON "media_asset"("publicId");

-- CreateIndex
CREATE INDEX "media_asset_ownerType_ownerId_idx" ON "media_asset"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "sermon_feature_status_order_idx" ON "sermon_feature"("status", "order");

-- CreateIndex
CREATE INDEX "sermon_feature_videoId_idx" ON "sermon_feature"("videoId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "prayer_request_status_createdAt_idx" ON "prayer_request"("status", "createdAt");
