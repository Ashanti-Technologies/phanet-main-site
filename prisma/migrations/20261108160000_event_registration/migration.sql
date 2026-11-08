-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MEETING', 'CAMP');

-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendeeRelationship" AS ENUM ('SELF', 'SPOUSE', 'CHILD', 'GUEST');

-- CreateEnum
CREATE TYPE "AgeGroup" AS ENUM ('ADULT', 'TEEN', 'CHILD', 'INFANT');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('PRIVATE_CAR', 'PUBLIC_TRANSPORT', 'ORGANISED_TRANSPORT', 'FLIGHT', 'OTHER');

-- AlterTable
ALTER TABLE "event" ADD COLUMN     "registrationClosesAt" TIMESTAMP(3),
ADD COLUMN     "registrationEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registrationFields" JSONB,
ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'MEETING';

-- CreateTable
CREATE TABLE "event_registration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "registrantId" TEXT NOT NULL,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
    "arrivalDate" DATE NOT NULL,
    "arrivalTime" TEXT,
    "travelMode" "TravelMode",
    "origin" TEXT,
    "notes" TEXT,
    "contactConsent" BOOLEAN NOT NULL DEFAULT false,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendee" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "relationship" "AttendeeRelationship" NOT NULL,
    "ageGroup" "AgeGroup",
    "dietaryPreference" TEXT,
    "allergies" TEXT,
    "answers" JSONB,
    "roomId" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_room_type" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_room_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_room" (
    "id" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beds" INTEGER NOT NULL,
    "gender" "Gender",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_registration_eventId_status_idx" ON "event_registration"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "event_registration_eventId_registrantId_key" ON "event_registration"("eventId", "registrantId");

-- CreateIndex
CREATE INDEX "event_attendee_registrationId_idx" ON "event_attendee"("registrationId");

-- CreateIndex
CREATE INDEX "event_attendee_roomId_idx" ON "event_attendee"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendee_eventId_memberId_key" ON "event_attendee"("eventId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "event_room_type_eventId_name_key" ON "event_room_type"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "event_room_roomTypeId_name_key" ON "event_room"("roomTypeId", "name");

-- AddForeignKey
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_registration" ADD CONSTRAINT "event_registration_registrantId_fkey" FOREIGN KEY ("registrantId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "event_registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee" ADD CONSTRAINT "event_attendee_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "event_room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_room_type" ADD CONSTRAINT "event_room_type_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_room" ADD CONSTRAINT "event_room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "event_room_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

