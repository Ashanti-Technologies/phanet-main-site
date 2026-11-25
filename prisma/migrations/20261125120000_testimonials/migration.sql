-- CreateTable
CREATE TABLE "testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "quote" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonial_status_order_idx" ON "testimonial"("status", "order");

