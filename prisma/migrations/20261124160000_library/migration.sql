-- CreateEnum
CREATE TYPE "PublicationKind" AS ENUM ('BOOK', 'DEVOTIONAL', 'BOOKLET', 'MAGAZINE');

-- CreateEnum
CREATE TYPE "PublicationAccess" AS ENUM ('FREE', 'AMAZON', 'PAID');

-- CreateTable
CREATE TABLE "author" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtext" TEXT,
    "avatarUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "kind" "PublicationKind" NOT NULL DEFAULT 'BOOK',
    "year" INTEGER,
    "authorId" TEXT NOT NULL,
    "access" "PublicationAccess" NOT NULL DEFAULT 'FREE',
    "pdfPublicId" TEXT,
    "pageCount" INTEGER,
    "previewPages" INTEGER NOT NULL DEFAULT 10,
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "coverUrl" TEXT,
    "backCoverUrl" TEXT,
    "spineColor" TEXT NOT NULL DEFAULT '#7c2d12',
    "buyUrl" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "author_slug_key" ON "author"("slug");

-- CreateIndex
CREATE INDEX "author_order_idx" ON "author"("order");

-- CreateIndex
CREATE UNIQUE INDEX "publication_slug_key" ON "publication"("slug");

-- CreateIndex
CREATE INDEX "publication_authorId_idx" ON "publication"("authorId");

-- CreateIndex
CREATE INDEX "publication_status_order_idx" ON "publication"("status", "order");

-- AddForeignKey
ALTER TABLE "publication" ADD CONSTRAINT "publication_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

