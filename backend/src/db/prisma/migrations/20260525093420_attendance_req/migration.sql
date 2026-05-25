/*
  Warnings:

  - You are about to drop the column `attendance_id` on the `attendance_requests` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `attendance_requests` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "attendance_requests" DROP CONSTRAINT "attendance_requests_attendance_id_fkey";

-- DropIndex
DROP INDEX "attendance_requests_attendance_id_idx";

-- AlterTable
ALTER TABLE "attendance_requests" DROP COLUMN "attendance_id",
DROP COLUMN "notes";
