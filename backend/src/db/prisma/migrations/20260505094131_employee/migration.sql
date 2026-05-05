/*
  Warnings:

  - You are about to drop the column `city` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `contract_type` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `employment_status` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `employment_type` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `hierarchy` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `joining_date` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `postal_code` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `employees` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `personal_details` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `personal_details` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `salary` to the `bank_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `personal_details` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `personal_details` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MunicipalityType" AS ENUM ('metropolitian', 'sub_metropolitian', 'municipality', 'rural_municipality');

-- DropIndex
DROP INDEX "employees_email_key";

-- AlterTable
ALTER TABLE "bank_details" ADD COLUMN     "contract_type" TEXT,
ADD COLUMN     "salary" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "city",
DROP COLUMN "contract_type",
DROP COLUMN "department",
DROP COLUMN "email",
DROP COLUMN "employment_status",
DROP COLUMN "employment_type",
DROP COLUMN "hierarchy",
DROP COLUMN "joining_date",
DROP COLUMN "level",
DROP COLUMN "phone",
DROP COLUMN "position",
DROP COLUMN "postal_code",
DROP COLUMN "salary",
DROP COLUMN "state";

-- AlterTable
ALTER TABLE "personal_details" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "municipality" "MunicipalityType",
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "tole" TEXT,
ADD COLUMN     "ward" INTEGER;

-- CreateTable
CREATE TABLE "Department" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "departmaent_name" TEXT NOT NULL,
    "hirerarchy" TEXT,
    "joining_date" DATE NOT NULL,
    "previous_exprience" TEXT,
    "employment_type" TEXT,
    "employment_status" TEXT,
    "designation" TEXT,
    "level" TEXT,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_email_key" ON "personal_details"("email");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_phone_key" ON "personal_details"("phone");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
