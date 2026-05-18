/*
  Warnings:

  - The `check_in` column on the `attendance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `check_out` column on the `attendance` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `account_number` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `branch` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `contract_type` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `current_address` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `date_of_birth` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `employment_status` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `employment_type` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `father_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `first_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `grandfather_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `hierarchy` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `joining_date` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `marital_status` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `mother_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `permanent_address` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `postal_code` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `previous_experience` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `leave_type` on the `leaves` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[type]` on the table `leave_policies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `deviceId` to the `attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leave_type_id` to the `leaves` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MunicipalityType" AS ENUM ('metropolitian', 'sub_metropolitian', 'municipality', 'rural_municipality');

-- DropIndex
DROP INDEX "employees_email_key";

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "return_date" DATE;

-- AlterTable
ALTER TABLE "attendance" ADD COLUMN     "biomeric_id" TEXT,
ADD COLUMN     "deviceId" TEXT NOT NULL,
DROP COLUMN "check_in",
ADD COLUMN     "check_in" TIMESTAMP(3),
DROP COLUMN "check_out",
ADD COLUMN     "check_out" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "employee_documents" ADD COLUMN     "file_url" TEXT;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "account_number",
DROP COLUMN "bank_name",
DROP COLUMN "branch",
DROP COLUMN "city",
DROP COLUMN "contract_type",
DROP COLUMN "current_address",
DROP COLUMN "date_of_birth",
DROP COLUMN "department",
DROP COLUMN "email",
DROP COLUMN "employment_status",
DROP COLUMN "employment_type",
DROP COLUMN "father_name",
DROP COLUMN "first_name",
DROP COLUMN "gender",
DROP COLUMN "grandfather_name",
DROP COLUMN "hierarchy",
DROP COLUMN "joining_date",
DROP COLUMN "last_name",
DROP COLUMN "level",
DROP COLUMN "marital_status",
DROP COLUMN "mother_name",
DROP COLUMN "permanent_address",
DROP COLUMN "phone",
DROP COLUMN "position",
DROP COLUMN "postal_code",
DROP COLUMN "previous_experience",
DROP COLUMN "salary",
DROP COLUMN "state",
ADD COLUMN     "employee_verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "profile_image" TEXT,
ADD COLUMN     "verification_pending" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "leaves" DROP COLUMN "leave_type",
ADD COLUMN     "leave_type_id" UUID NOT NULL;

-- DropEnum
DROP TYPE "LeaveType";

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "department_name" TEXT NOT NULL,
    "hierarchy" TEXT,
    "joining_date" DATE NOT NULL,
    "previous_experience" TEXT,
    "employment_type" TEXT,
    "employment_status" TEXT,
    "designation" TEXT,
    "level" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_details" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
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
    "country" TEXT,
    "state" TEXT,
    "district" TEXT,
    "city" TEXT,
    "municipality" "MunicipalityType",
    "ward" INTEGER,
    "tole" TEXT,

    CONSTRAINT "personal_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "account_number" TEXT NOT NULL,
    "salary" DECIMAL(12,2) NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "contract_type" TEXT,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL,
    "serial_number" TEXT NOT NULL,
    "location" TEXT,
    "device_name" TEXT NOT NULL,
    "device_model" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_mappings" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "biometric_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "leavePolicyId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_employee_id_key" ON "personal_details"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_email_key" ON "personal_details"("email");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_phone_key" ON "personal_details"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_citizenship_number_key" ON "personal_details"("citizenship_number");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_pan_number_key" ON "personal_details"("pan_number");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_nid_number_key" ON "personal_details"("nid_number");

-- CreateIndex
CREATE UNIQUE INDEX "personal_details_ssid_number_key" ON "personal_details"("ssid_number");

-- CreateIndex
CREATE UNIQUE INDEX "bank_details_employee_id_key" ON "bank_details"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "devices_serial_number_key" ON "devices"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "devices_ip_key" ON "devices"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "device_mappings_device_id_biometric_id_key" ON "device_mappings"("device_id", "biometric_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_mappings_employee_id_device_id_key" ON "device_mappings"("employee_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_year_leave_type_id_key" ON "leave_balances"("employee_id", "year", "leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_type_key" ON "leave_policies"("type");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_details" ADD CONSTRAINT "personal_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("serial_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_mappings" ADD CONSTRAINT "device_mappings_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_mappings" ADD CONSTRAINT "device_mappings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
