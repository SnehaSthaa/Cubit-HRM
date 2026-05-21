/*
  Warnings:

  - A unique constraint covering the columns `[biometric_id]` on the table `device_mappings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "device_mappings_biometric_id_key" ON "device_mappings"("biometric_id");
