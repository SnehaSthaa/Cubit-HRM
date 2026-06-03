-- CreateEnum
CREATE TYPE "ProfileSection" AS ENUM ('personal', 'documents', 'emergency', 'bank_details', 'department');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "profile_update_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "section" "ProfileSection" NOT NULL,
    "requested_data" JSONB NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_update_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_update_requests_employee_id_idx" ON "profile_update_requests"("employee_id");

-- CreateIndex
CREATE INDEX "profile_update_requests_status_idx" ON "profile_update_requests"("status");

-- AddForeignKey
ALTER TABLE "profile_update_requests" ADD CONSTRAINT "profile_update_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_update_requests" ADD CONSTRAINT "profile_update_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;
