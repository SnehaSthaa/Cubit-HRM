/*
  Warnings:

  - You are about to drop the column `departmaent_name` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `hirerarchy` on the `Department` table. All the data in the column will be lost.
  - You are about to drop the column `previous_exprience` on the `Department` table. All the data in the column will be lost.
  - Added the required column `department_name` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Department" DROP COLUMN "departmaent_name",
DROP COLUMN "hirerarchy",
DROP COLUMN "previous_exprience",
ADD COLUMN     "department_name" TEXT NOT NULL,
ADD COLUMN     "hierarchy" TEXT,
ADD COLUMN     "previous_experience" TEXT;
