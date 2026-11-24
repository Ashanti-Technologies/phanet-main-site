-- CreateEnum
CREATE TYPE "AlbumVisibility" AS ENUM ('PUBLIC', 'MEMBERS');

-- CreateEnum
CREATE TYPE "TakedownReason" AS ENUM ('ME_IN_PHOTO', 'MY_CHILD_IN_PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "TakedownStatus" AS ENUM ('PENDING', 'REMOVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "gallery_album" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "visibility" "AlbumVisibility" NOT NULL DEFAULT 'PUBLIC',
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "eventId" TEXT,
    "coverPhotoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_photo" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_takedown" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" "TakedownReason" NOT NULL,
    "note" TEXT,
    "status" "TakedownStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_takedown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_album_slug_key" ON "gallery_album"("slug");

-- CreateIndex
CREATE INDEX "gallery_album_status_date_idx" ON "gallery_album"("status", "date");

-- CreateIndex
CREATE INDEX "gallery_album_eventId_idx" ON "gallery_album"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_photo_publicId_key" ON "gallery_photo"("publicId");

-- CreateIndex
CREATE INDEX "gallery_photo_albumId_order_idx" ON "gallery_photo"("albumId", "order");

-- CreateIndex
CREATE INDEX "gallery_takedown_status_createdAt_idx" ON "gallery_takedown"("status", "createdAt");

-- CreateIndex
CREATE INDEX "gallery_takedown_photoId_idx" ON "gallery_takedown"("photoId");

-- AddForeignKey
ALTER TABLE "gallery_album" ADD CONSTRAINT "gallery_album_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_photo" ADD CONSTRAINT "gallery_photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "gallery_album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_takedown" ADD CONSTRAINT "gallery_takedown_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "gallery_photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_takedown" ADD CONSTRAINT "gallery_takedown_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

