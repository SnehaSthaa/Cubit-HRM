/*
  Warnings:

  - You are about to drop the column `current_address` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `father_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `grandfather_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `marital_status` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `mother_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `permanent_address` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `previous_experience` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `leave_type` on the `leaves` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[type]` on the table `leave_policies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leave_type_id` to the `leaves` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "return_date" DATE;

-- AlterTable
ALTER TABLE "employee_documents" ADD COLUMN     "file_url" TEXT;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "current_address",
DROP COLUMN "date_of_birth",
DROP COLUMN "father_name",
DROP COLUMN "first_name",
DROP COLUMN "gender",
DROP COLUMN "grandfather_name",
DROP COLUMN "last_name",
DROP COLUMN "marital_status",
DROP COLUMN "mother_name",
DROP COLUMN "permanent_address",
DROP COLUMN "previous_experience",
ADD COLUMN     "employee_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_image" TEXT,
ADD COLUMN     "verification_pending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "leaves" DROP COLUMN "leave_type",
ADD COLUMN     "leave_type_id" UUID NOT NULL;

-- DropEnum
DROP TYPE "LeaveType";

-- CreateTable
CREATE TABLE "personal_details" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" TEXT,
    "marital_status" TEXT,
    "citizenship_number" TEXT,
    "pan_number" TEXT,
    "nid_number" TEXT,
    "ssid_number" TEXT,
    "father_name" TEXT,
    "mother_name" TEXT,
    "grandfather_name" TEXT,
    "current_address" TEXT,
    "permanent_address" TEXT,

    CONSTRAINT "personal_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "leavePolicyId" UUID,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_employee_id_key" ON "personal_details"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_citizenship_number_key" ON "personal_details"("citizenship_number");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_pan_number_key" ON "personal_details"("pan_number");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_nid_number_key" ON "personal_details"("nid_number");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_ssid_number_key" ON "personal_details"("ssid_number");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_year_leave_type_id_key" ON "leave_balances"("employee_id", "year", "leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_type_key" ON "leave_policies"("type");

-- AddForeignKey
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
