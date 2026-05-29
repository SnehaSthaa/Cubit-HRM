/*
  Warnings:

  - Made the column `position` on table `departments` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "position" SET NOT NULL;
