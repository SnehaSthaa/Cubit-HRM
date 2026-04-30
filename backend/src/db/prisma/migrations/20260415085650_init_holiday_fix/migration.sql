-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('public', 'company', 'regional', 'religious');

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "holiday_type" "HolidayType" NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);
