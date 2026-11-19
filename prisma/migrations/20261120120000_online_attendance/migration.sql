-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('IN_PERSON', 'ONLINE');

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "allowOnline" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "event_attendee" ADD COLUMN     "attendance" "AttendanceMode" NOT NULL DEFAULT 'IN_PERSON',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "regionId" TEXT;

-- CreateIndex
CREATE INDEX "event_attendee_eventId_attendance_idx" ON "event_attendee"("eventId", "attendance");

-- CreateIndex
CREATE INDEX "event_attendee_countryId_idx" ON "event_attendee"("countryId");

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "city"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data: travel / arrival / catering questions on existing forms only apply to
-- people attending in person (see DEFAULT_REGISTRATION_FIELDS).
UPDATE "event" e
SET "registrationFields" = (
  SELECT jsonb_agg(
    CASE WHEN f->>'id' IN ('arrival_date', 'arrival_time', 'travel_mode', 'origin', 'from_location', 'food', 'allergies')
      THEN f || '{"inPersonOnly": true}'::jsonb
      ELSE f
    END ORDER BY ord)
  FROM jsonb_array_elements(e."registrationFields"::jsonb) WITH ORDINALITY AS t(f, ord)
)
WHERE jsonb_typeof(e."registrationFields"::jsonb) = 'array'
  AND jsonb_array_length(e."registrationFields"::jsonb) > 0;
