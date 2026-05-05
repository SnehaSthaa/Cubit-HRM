import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("🌱 Seeding database...");

  const saltRounds = 10;
  const commonPassword = await bcrypt.hash("password123", saltRounds);

  // 1. LEAVE POLICIES
  const annualPolicy = await prisma.leavePolicy.upsert({
    where: { type: "annual" },
    update: {},
    create: {
      name: "Annual Leave",
      type: "annual",
      annual_quota: 20,
      carry_forward: true,
    },
  });

  // 2. ADMIN USER & EMPLOYEE PROFILE
  const admin = await prisma.user.upsert({
    where: { email: "admin@harmonyhr.com" },
    update: {},
    create: {
      email: "admin@harmonyhr.com",
      password_hash: commonPassword,
      name: "System Admin",
      role: "super_admin",
      employee: {
        create: {
          employee_id: "EMP-001",
          employee_verified: true,
          department: {
            create: {
              department_name: "Management",
              joining_date: new Date(),
              designation: "CTO",
            },
          },
          personal_details: {
            create: {
              first_name: "System",
              last_name: "Admin",
              email: "admin@harmonyhr.com",
              phone: "9800000000",
            },
          },
        },
      },
    },
    include: { employee: true },
  });

  // 3. REGULAR EMPLOYEE
  const johnUser = await prisma.user.upsert({
    where: { email: "john@harmonyhr.com" },
    update: {},
    create: {
      email: "john@harmonyhr.com",
      password_hash: commonPassword,
      name: "John Doe",
      role: "employee",
      employee: {
        create: {
          employee_id: "EMP-002",
          department: {
            create: [
              {
                department_name: "Engineering",
                joining_date: new Date(),
                designation: "Senior Developer",
              },
            ],
          },
          personal_details: {
            create: {
              first_name: "John",
              last_name: "Doe",
              email: "john@personal.com",
              phone: "9812345678",
            },
          },
        },
      },
    },
    include: { employee: true },
  });

  const johnId = johnUser.employee?.id;

  if (johnId) {
    await prisma.attendance.upsert({
      where: {
        employee_id_date: {
          employee_id: johnId,
          date: new Date("2024-05-01"),
        },
      },
      update: {},
      create: {
        employee_id: johnId,
        date: new Date("2024-05-01"),
        status: "present",
      },
    });

    // 5. LEAVE BALANCE (John)
    await prisma.leaveBalance.upsert({
      where: {
        employee_id_year_leave_type_id: {
          employee_id: johnId,
          year: 2026,
          leave_type_id: annualPolicy.id,
        },
      },
      update: {},
      create: {
        employee_id: johnId,
        year: 2026,
        leave_type_id: annualPolicy.id,
        total: 20,
        remaining: 17,
        used: 3,
      },
    });

    // 6. LEAVE REQUEST (John)
    await prisma.leave.create({
      data: {
        employee_id: johnId,
        start_date: new Date("2024-05-10"),
        end_date: new Date("2024-05-13"),
        leave_type_id: annualPolicy.id,
        days_count: 3,
        reason: "Family vacation",
        status: "approved",
      },
    });
  }

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
