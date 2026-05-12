import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("🌱 Seeding database...");

  // =====================
  // LEAVE POLICY
  // =====================
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
      role: "super_admin",
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

  await prisma.department.create({
    data: {
      employee_id: adminEmployee.id,
      department_name: "Management",
      joining_date: new Date(),
      employment_status: "Active",
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
      role: "hr_admin",
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

  await prisma.department.create({
    data: {
      employee_id: hrEmployee.id,
      department_name: "Human Resources",
      joining_date: new Date(),
      employment_status: "Active",
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
      role: "employee",
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

  await prisma.department.create({
    data: {
      employee_id: employee.id,
      department_name: "Engineering",
      joining_date: new Date("2024-01-15"),
      employment_status: "Active",
      employment_type: "Full-time",
      designation: "Software Engineer",
      level: "Mid",
    },
  });

  // =====================
  // ATTENDANCE
  // =====================
  await prisma.attendance.createMany({
    data: [
      {
        employee_id: employee.id,
        date: new Date("2024-04-01"),
        status: "present",
      },
      {
        employee_id: employee.id,
        date: new Date("2024-04-02"),
        status: "present",
      },
      {
        employee_id: employee.id,
        date: new Date("2024-04-03"),
        status: "late",
      },
      {
        employee_id: employee.id,
        date: new Date("2024-04-04"),
        status: "absent",
      },
    ],
    skipDuplicates: true,
  });

  // =====================
  // LEAVE BALANCE
  // =====================
  await prisma.leaveBalance.createMany({
    data: [
      {
        employee_id: employee.id,
        year: 2024,
        leave_type_id: leavePolicy.id,
        total: 20,
        used: 3,
        remaining: 17,
      },
      {
        employee_id: employee.id,
        year: 2024,
        leave_type_id: sickLeavePolicy.id,
        total: 10,
        used: 0,
        remaining: 10,
      },
    ],
    skipDuplicates: true,
  });

  // =====================
  // LEAVE
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
      approved_by: adminEmployee.id,
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
  // HOLIDAY
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
