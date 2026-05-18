/*
  Warnings:

  - You are about to drop the column `biomeric_id` on the `attendance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_deviceId_fkey";

-- AlterTable
ALTER TABLE "attendance" DROP COLUMN "biomeric_id",
ADD COLUMN     "biometric_id" TEXT,
ALTER COLUMN "deviceId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("serial_number") ON DELETE SET NULL ON UPDATE CASCADE;
