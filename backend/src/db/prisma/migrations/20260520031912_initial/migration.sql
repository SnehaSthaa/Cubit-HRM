-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'hr_admin', 'employee');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'late', 'half_day', 'on_leave');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "TakeHomeStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('pending', 'processed', 'paid');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('available', 'assigned', 'maintenance', 'retired');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('attendance', 'payroll', 'leave', 'performance');

-- CreateEnum
CREATE TYPE "HolidayType" AS ENUM ('public', 'company', 'regional', 'religious');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('active', 'notice_period', 'resigned');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "employee_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT,
    "joining_date" DATE NOT NULL,
    "salary" DECIMAL(12,2),
    "manager_id" UUID,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "account_number" TEXT,
    "bank_name" TEXT,
    "branch" TEXT,
    "contract_type" TEXT,
    "current_address" TEXT,
    "employment_status" "EmploymentStatus" NOT NULL DEFAULT 'active',
    "employment_type" TEXT NOT NULL DEFAULT 'Full-time',
    "father_name" TEXT,
    "grandfather_name" TEXT,
    "hierarchy" TEXT,
    "level" TEXT,
    "marital_status" TEXT,
    "profile_image" TEXT,
    "mother_name" TEXT,
    "permanent_address" TEXT,
    "previous_experience" TEXT,
    "citizenship_number" TEXT,
    "nid_number" TEXT,
    "pan_number" TEXT,
    "ssid_number" TEXT,
    "employee_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_pending" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "file_size" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_url" TEXT,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "check_in" TIME(6),
    "check_out" TIME(6),
    "status" "AttendanceStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "days_count" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'pending',
    "approved_by" UUID,
    "approval_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "base_salary" DECIMAL(12,2) NOT NULL,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_salary" DECIMAL(12,2) NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'pending',
    "paid_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "asset_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'available',
    "category" TEXT NOT NULL,
    "serial_number" TEXT,
    "purchase_cost" DECIMAL(12,2),
    "purchase_date" DATE,
    "assigned_date" DATE,
    "location" TEXT,
    "notes" TEXT,
    "reason" TEXT,
    "return_date" DATE,
    "reveiwed_at" TIMESTAMP(3),
    "assigned_to" UUID,
    "reviewed_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets_takehome_dates" (
    "id" UUID NOT NULL,
    "status" "TakeHomeStatus" NOT NULL DEFAULT 'pending',
    "end_date" DATE,
    "start_date" DATE,
    "reason" TEXT,
    "asset_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_takehome_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "from_date" DATE,
    "to_date" DATE,
    "filters" JSONB,
    "data" JSONB,
    "generated_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holidays" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "holiday_type" "HolidayType" NOT NULL DEFAULT 'public',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_policies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "annual_quota" INTEGER NOT NULL,
    "pro_rata" BOOLEAN NOT NULL DEFAULT false,
    "carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "leave_type_id" UUID NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissions" JSONB NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_id_key" ON "employees"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE UNIQUE INDEX "employees_citizenship_number_key" ON "employees"("citizenship_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_nid_number_key" ON "employees"("nid_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_pan_number_key" ON "employees"("pan_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_ssid_number_key" ON "employees"("ssid_number");

-- CreateIndex
CREATE INDEX "emergency_contacts_employee_id_idx" ON "emergency_contacts"("employee_id");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_employee_id_date_key" ON "attendance"("employee_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_employee_id_month_year_key" ON "payroll"("employee_id", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "assets_asset_id_key" ON "assets"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_serial_number_key" ON "assets"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "leave_policies_type_key" ON "leave_policies"("type");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employee_id_year_leave_type_id_key" ON "leave_balances"("employee_id", "year", "leave_type_id");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets_takehome_dates" ADD CONSTRAINT "assets_takehome_dates_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "leave_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
