import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { allPermission } from "@/permissions/allowed-permission";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const MANUAL_DEVICE_SERIAL = "MANUAL";

async function ensureManualDevice(): Promise<string> {
  const existing = await prisma.device.findUnique({
    where: { serial_number: MANUAL_DEVICE_SERIAL },
  });
  if (existing) return existing.serial_number;

  const created = await prisma.device.create({
    data: {
      serial_number: MANUAL_DEVICE_SERIAL,
      device_name: "Manual Entry",
      device_model: "N/A",
      ip: "0.0.0.0",
      is_active: false,
    },
  });
  return created.serial_number;
}

async function main() {
  console.log("🌱 Seeding database...");

  for (const [role, permissions] of Object.entries(allPermission)) {
    await prisma.permission.upsert({
      where: { role: role as UserRole },
      update: { permissions },
      create: { role: role as UserRole, permissions },
    });
  }

  const deviceSerial = await ensureManualDevice();

  const leavePolicy = await prisma.leavePolicy.upsert({
    where: { type: "annual" },
    update: {},
    create: {
      name: "Annual Leave",
      type: "annual",
      annual_quota: 20,
    },
  });

  const sickLeavePolicy = await prisma.leavePolicy.upsert({
    where: { type: "sick" },
    update: {},
    create: {
      name: "Sick Leave",
      type: "sick",
      annual_quota: 10,
    },
  });

  // =====================
  // ADMIN USER
  // =====================
  const admin = await prisma.user.upsert({
    where: { email: "admin@harmonyhr.com" },
    update: {},
    create: {
      email: "admin@harmonyhr.com",
      password_hash: await bcrypt.hash("admin123", 10),
      name: "System Admin",
      role: ["super_admin"],
    },
  });

  const adminEmployee = await prisma.employee.upsert({
    where: { user_id: admin.id },
    update: {},
    create: {
      user_id: admin.id,
      employee_id: "EMP-ADMIN-001",
      personal_details: {
        create: {
          first_name: "System",
          last_name: "Admin",
          email: "admin@harmonyhr.com",
          phone: "9800000000",
        },
      },
      bank_details: {
        create: {
          account_number: "001-ADMIN-001",
          salary: 100000,
          bank_name: "Nepal Bank",
          branch: "Kathmandu",
          contract_type: "Permanent",
        },
      },
    },
  });

  await prisma.department.upsert({
    where: {
      id:
        (
          await prisma.department.findFirst({
            where: { employee_id: adminEmployee.id },
          })
        )?.id ?? "00000000-0000-0000-0000-000000000000",
    },
    update: {},
    create: {
      employee_id: adminEmployee.id,
      department_name: "Management",
      joining_date: new Date(),
      employment_status: "active",
      employment_type: "Full-time",
      designation: "System Administrator",
    },
  });

  // =====================
  // HR USER
  // =====================
  const hrUser = await prisma.user.upsert({
    where: { email: "hr@harmonyhr.com" },
    update: {},
    create: {
      email: "hr@harmonyhr.com",
      password_hash: await bcrypt.hash("hr123", 10),
      name: "HR Admin",
      // FIX: role is UserRole[] (array)
      role: ["hr_admin", "employee"],
    },
  });

  const hrEmployee = await prisma.employee.upsert({
    where: { user_id: hrUser.id },
    update: {},
    create: {
      user_id: hrUser.id,
      employee_id: "EMP-HR-001",
      personal_details: {
        create: {
          first_name: "HR",
          last_name: "Admin",
          email: "hr@harmonyhr.com",
          phone: "9800000001",
        },
      },
      bank_details: {
        create: {
          account_number: "001-HR-001",
          salary: 80000,
          bank_name: "Nepal Bank",
          branch: "Kathmandu",
          contract_type: "Permanent",
        },
      },
    },
  });

  await prisma.department.upsert({
    where: {
      id:
        (
          await prisma.department.findFirst({
            where: { employee_id: hrEmployee.id },
          })
        )?.id ?? "00000000-0000-0000-0000-000000000001",
    },
    update: {},
    create: {
      employee_id: hrEmployee.id,
      department_name: "Human Resources",
      joining_date: new Date(),
      employment_status: "active",
      employment_type: "Full-time",
      designation: "HR Manager",
    },
  });

  // =====================
  // EMPLOYEE USER
  // =====================
  const employeeUser = await prisma.user.upsert({
    where: { email: "john@harmonyhr.com" },
    update: {},
    create: {
      email: "john@harmonyhr.com",
      password_hash: await bcrypt.hash("emp123", 10),
      name: "John Doe",
      // FIX: role is UserRole[] (array)
      role: ["employee"],
    },
  });

  const employee = await prisma.employee.upsert({
    where: { user_id: employeeUser.id },
    update: {},
    create: {
      user_id: employeeUser.id,
      employee_id: "EMP001",
      personal_details: {
        create: {
          first_name: "John",
          last_name: "Doe",
          email: "john@harmonyhr.com",
          phone: "9800000002",
          date_of_birth: new Date("1995-06-15"),
          gender: "Male",
          marital_status: "Single",
          current_address: "Kathmandu, Nepal",
          permanent_address: "Pokhara, Nepal",
          father_name: "Robert Doe",
          mother_name: "Jane Doe",
        },
      },
      bank_details: {
        create: {
          account_number: "001-EMP-001",
          salary: 60000,
          bank_name: "Himalayan Bank",
          branch: "New Road",
          contract_type: "Permanent",
        },
      },
      emergencyContacts: {
        create: {
          name: "Robert Doe",
          relation: "Father",
          phone: "9800000099",
          email: "robert@example.com",
        },
      },
    },
  });

  await prisma.department.upsert({
    where: {
      id:
        (
          await prisma.department.findFirst({
            where: { employee_id: employee.id },
          })
        )?.id ?? "00000000-0000-0000-0000-000000000002",
    },
    update: {},
    create: {
      employee_id: employee.id,
      department_name: "Engineering",
      joining_date: new Date("2024-01-15"),
      employment_status: "active",
      employment_type: "Full-time",
      designation: "Software Engineer",
      level: "Mid",
    },
  });

  // =====================
  // ATTENDANCE
  // FIX: deviceSerial now properly assigned from ensureManualDevice()
  // =====================
  await prisma.attendance.createMany({
    data: [
      {
        employee_id: employee.id,
        date: new Date("2024-04-01"),
        status: "present",
        deviceId: deviceSerial,
      },
      {
        employee_id: employee.id,
        date: new Date("2024-04-02"),
        status: "present",
        deviceId: deviceSerial,
      },
      {
        employee_id: employee.id,
        date: new Date("2024-04-03"),
        status: "late",
        deviceId: deviceSerial,
      },
      {
        employee_id: employee.id,
        date: new Date("2024-04-04"),
        status: "absent",
        deviceId: deviceSerial,
      },
    ],
    skipDuplicates: true,
  });

  // =====================
  // LEAVE BALANCE
  // FIX: removed `remaining` — no such field in schema
  // =====================
  await prisma.leaveBalance.createMany({
    data: [
      {
        employee_id: employee.id,
        year: 2024,
        leave_type_id: leavePolicy.id,
        total: 20,
        used: 3,
      },
      {
        employee_id: employee.id,
        year: 2024,
        leave_type_id: sickLeavePolicy.id,
        total: 10,
        used: 0,
      },
    ],
    skipDuplicates: true,
  });

  // =====================
  // LEAVE
  // FIX: approved_by references a User id, not an Employee id
  // =====================
  await prisma.leave.create({
    data: {
      employee_id: employee.id,
      start_date: new Date("2024-05-01"),
      end_date: new Date("2024-05-03"),
      leave_type_id: leavePolicy.id,
      days_count: 3,
      reason: "Family vacation",
      status: "approved",
      approved_by: admin.id,
      approval_notes: "Approved by admin",
    },
  });

  // =====================
  // PAYROLL
  // =====================
  await prisma.payroll.createMany({
    data: [
      {
        employee_id: employee.id,
        month: 4,
        year: 2024,
        base_salary: 60000,
        bonus: 5000,
        deductions: 3000,
        net_salary: 62000,
        status: "paid",
        paid_date: new Date("2024-04-30"),
      },
      {
        employee_id: employee.id,
        month: 5,
        year: 2024,
        base_salary: 60000,
        bonus: 0,
        deductions: 3000,
        net_salary: 57000,
        status: "processed",
      },
    ],
    skipDuplicates: true,
  });

  // =====================
  // ASSET
  // =====================
  await prisma.asset.upsert({
    where: { asset_id: "ASSET-001" },
    update: {},
    create: {
      asset_id: "ASSET-001",
      name: "MacBook Pro 14",
      category: "Laptop",
      serial_number: "SN-MBP-2024-001",
      purchase_cost: 250000,
      purchase_date: new Date("2024-01-01"),
      status: "assigned",
      assigned_to: employee.id,
      assigned_date: new Date("2024-01-15"),
      location: "Kathmandu Office",
    },
  });

  // =====================
  // HOLIDAYS
  // =====================
  await prisma.holiday.createMany({
    data: [
      {
        name: "New Year",
        start_date: new Date("2024-01-01"),
        end_date: new Date("2024-01-01"),
        holiday_type: "public",
      },
      {
        name: "Dashain",
        start_date: new Date("2024-10-12"),
        end_date: new Date("2024-10-22"),
        holiday_type: "public",
      },
      {
        name: "Tihar",
        start_date: new Date("2024-11-01"),
        end_date: new Date("2024-11-05"),
        holiday_type: "public",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Seed completed successfully!");
  console.log("📋 Login credentials:");
  console.log("   Admin     → admin@harmonyhr.com / admin123");
  console.log("   HR Admin  → hr@harmonyhr.com / hr123");
  console.log("   Employee  → john@harmonyhr.com / emp123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
