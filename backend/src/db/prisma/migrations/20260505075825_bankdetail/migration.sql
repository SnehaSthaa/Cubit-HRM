/*
  Warnings:

  - You are about to drop the column `account_number` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `branch` on the `employees` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "employees" DROP COLUMN "account_number",
DROP COLUMN "bank_name",
DROP COLUMN "branch";

-- CreateTable
CREATE TABLE "bank_details" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch" TEXT NOT NULL,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_details_employee_id_key" ON "bank_details"("employee_id");

-- AddForeignKey
ALTER TABLE "bank_details" ADD CONSTRAINT "bank_details_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
