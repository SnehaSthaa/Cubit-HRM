import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { allPermission } from "@/permissions/allowed-permission";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("🌱 Seeding database...");
  //Permisions
  for (const [role, permissions] of Object.entries(allPermission)) {
    await prisma.permission.upsert({
      where: { role: role as UserRole },
      update: { permissions },
      create: { role: role as UserRole, permissions },
    });
  }

  // =====================
  // USERS
  // =====================
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@harmonyhr.com" },
    update: {},
    create: {
      email: "admin@harmonyhr.com",
      password_hash: adminPassword,
      name: "System Admin",
      role: ["super_admin"],
    },
  });

  const hrUser = await prisma.user.upsert({
    where: { email: "hr@harmonyhr.com" },
    update: {},
    create: {
      email: "hr@harmonyhr.com",
      password_hash: await bcrypt.hash("hr123", 10),
      name: "HR Admin",
      role: ["hr_admin", "employee"],
    },
  });
  await prisma.employee.upsert({
    where: { email: "admin@harmonyhr.com" },
    update: {},
    create: {
      user_id: admin.id,
      employee_id: "EMP-ADMIN-001",
      first_name: "System",
      last_name: "Admin",
      email: "admin@harmonyhr.com",
      department: "Management",
      joining_date: new Date(),
      employment_status: "active",
      employment_type: "Full-time",
    },
  });

  await prisma.employee.upsert({
    where: { email: "hr@harmonyhr.com" },
    update: {},
    create: {
      user_id: hrUser.id,
      employee_id: "EMP-HR-001",
      first_name: "HR",
      last_name: "Admin",
      email: "hr@harmonyhr.com",
      department: "Human Resources",
      joining_date: new Date(),
      employment_status: "active",
      employment_type: "Full-time",
      date_of_birth: new Date("1985-08-20"),
    },
  });

  const empPassword = await bcrypt.hash("emp123", 10);
  const employeeUser = await prisma.user.upsert({
    where: { email: "john@harmonyhr.com" },
    update: {},
    create: {
      email: "john@harmonyhr.com",
      password_hash: empPassword,
      name: "John Doe",
      role: ["employee"],
    },
  });

  // =====================
  // EMPLOYEE
  // =====================
  const employee = await prisma.employee.upsert({
    where: { user_id: employeeUser.id },
    update: {},
    create: {
      user_id: employeeUser.id,
      employee_id: "EMP001",
      first_name: "John",
      last_name: "Doe",
      email: "john@harmonyhr.com",
      department: "Engineering",
      joining_date: new Date("2024-01-15"),
      employment_status: "active",
      employment_type: "Full-time",
      date_of_birth: new Date("1990-06-15"),
    },
  });

  // =====================
  // LEAVE POLICY (IMPORTANT)
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
    ],
    skipDuplicates: true,
  });

  // =====================
  // LEAVE (FIXED)
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
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
