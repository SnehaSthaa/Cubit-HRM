/*
  Warnings:

  - You are about to drop the column `position` on the `departments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "departments" DROP COLUMN "position",
ADD COLUMN     "designation" TEXT;
