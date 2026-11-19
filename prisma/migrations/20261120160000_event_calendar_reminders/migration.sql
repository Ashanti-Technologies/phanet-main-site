-- AlterTable
ALTER TABLE "event" ADD COLUMN     "calendarReminders" INTEGER[] DEFAULT ARRAY[10080, 1440]::INTEGER[];
