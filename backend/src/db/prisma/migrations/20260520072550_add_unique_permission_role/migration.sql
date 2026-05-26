/*
  Warnings:

  - A unique constraint covering the columns `[role]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "permissions_role_key" ON "permissions"("role");
