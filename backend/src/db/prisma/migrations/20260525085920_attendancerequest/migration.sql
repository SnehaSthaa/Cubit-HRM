-- CreateEnum
CREATE TYPE "AttendanceRequestType" AS ENUM ('check_in', 'check_out', 'both');

-- CreateEnum
CREATE TYPE "AttendanceRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "attendance_requests" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "attendance_id" UUID,
    "date" DATE NOT NULL,
    "request_type" "AttendanceRequestType" NOT NULL,
    "requested_check_in" TIMESTAMPTZ,
    "requested_check_out" TIMESTAMPTZ,
    "requested_status" "AttendanceStatus",
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "status" "AttendanceRequestStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_requests_employee_id_idx" ON "attendance_requests"("employee_id");

-- CreateIndex
CREATE INDEX "attendance_requests_attendance_id_idx" ON "attendance_requests"("attendance_id");

-- CreateIndex
CREATE INDEX "attendance_requests_status_idx" ON "attendance_requests"("status");

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_requests" ADD CONSTRAINT "attendance_requests_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
