-- AlterEnum
ALTER TYPE "AttendeeRelationship" ADD VALUE 'RELATIVE';

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "cityId" TEXT;

-- CreateTable
CREATE TABLE "city" (
    "id" TEXT NOT NULL,
    "geonameId" INTEGER,
    "countryId" TEXT NOT NULL,
    "regionId" TEXT,
    "name" TEXT NOT NULL,
    "searchText" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "population" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "city_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "city_geonameId_key" ON "city"("geonameId");

-- CreateIndex
CREATE INDEX "city_countryId_idx" ON "city"("countryId");

-- CreateIndex
CREATE INDEX "city_regionId_idx" ON "city"("regionId");

-- CreateIndex
CREATE INDEX "member_cityId_idx" ON "member"("cityId");

-- AddForeignKey
ALTER TABLE "city" ADD CONSTRAINT "city_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "city" ADD CONSTRAINT "city_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

