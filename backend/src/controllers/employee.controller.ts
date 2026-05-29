import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";
import { sendWelcomeEmail } from "@/utils/mailer.js";
import { generateRandomPassword } from "@/utils/generatePassword.js";
import { EmploymentStatus } from "@prisma/client";
import { minioClient, MINIO_BASE_URL, ensureBucket } from "@/utils/minio.js";

const EMPLOYEE_FILES_BUCKET = "employee-files";

// Valid values from the MunicipalityType enum in schema.prisma
const VALID_MUNICIPALITY_TYPES = [
  "metropolitian",
  "sub_metropolitian",
  "municipality",
  "rural_municipality",
] as const;

type MunicipalityType = (typeof VALID_MUNICIPALITY_TYPES)[number];

function parseMunicipality(value: unknown): MunicipalityType | undefined {
  if (value === undefined || value === null) return undefined;
  if (VALID_MUNICIPALITY_TYPES.includes(value as MunicipalityType)) {
    return value as MunicipalityType;
  }
  throw new Error(
    `Invalid municipality type "${value}". Must be one of: ${VALID_MUNICIPALITY_TYPES.join(", ")}`,
  );
}

export class EmployeeController {
  // ── GET /employees ───────────────────────────────────────────────────────
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const {
        device_mapping,
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where: any = {};
      if (device_mapping === "null") {
        where.deviceMappings = { none: {} };
      } else if (device_mapping === "mapped") {
        where.deviceMappings = { some: {} };
      }

      const [employees, total] = await Promise.all([
        prisma.employee.findMany({
          where,
          skip,
          take,
          orderBy: { created_at: "desc" },
          include: {
            user: true,
            manager: { include: { personal_details: true } },
            personal_details: true,
            department: { orderBy: { joining_date: "desc" } },
            bank_details: true,
            assets: true,
            emergencyContacts: true,
            documents: true,
            deviceMappings: {
              include: {
                device: {
                  select: {
                    serial_number: true,
                    device_name: true,
                    location: true,
                    is_active: true,
                  },
                },
              },
            },
          },
        }),
        prisma.employee.count({ where }),
      ]);

      res.json({
        success: true,
        message: "Employees retrieved",
        data: employees,
        meta: {
          total,
          page: parseInt(page),
          limit: take,
          total_pages: Math.ceil(total / take),
        },
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /employees/:id ───────────────────────────────────────────────────
  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          user: true,
          manager: { include: { personal_details: true } },
          personal_details: true,
          department: { orderBy: { joining_date: "desc" } },
          bank_details: true,
          assets: true,
          emergencyContacts: true,
          documents: true,
          deviceMappings: {
            include: {
              device: {
                select: {
                  serial_number: true,
                  device_name: true,
                  location: true,
                  is_active: true,
                },
              },
            },
          },
        },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      res.json({
        success: true,
        message: "Employee retrieved",
        data: employee,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /employees ──────────────────────────────────────────────────────
  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const body = req.body;

      if (
        !body.email ||
        !body.first_name ||
        !body.last_name ||
        !body.department_name ||
        !body.joining_date ||
        !body.position
      ) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      let municipality: MunicipalityType | undefined;
      try {
        municipality = parseMunicipality(body.municipality);
      } catch (e: any) {
        return res.status(400).json({ success: false, message: e.message });
      }

      if (body.salary !== undefined) {
        if (!body.account_number || !body.bank_name || !body.branch) {
          return res.status(400).json({
            success: false,
            message:
              "account_number, bank_name, and branch are required when salary is provided",
          });
        }
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      });
      if (existingUser) {
        return res
          .status(400)
          .json({ success: false, message: "Email already in use" });
      }

      const randomPassword = generateRandomPassword();
      const createdUser = await prisma.user.create({
        data: {
          email: body.email,
          password_hash: await bcrypt.hash(randomPassword, 10),
          name: `${body.first_name} ${body.last_name}`.trim(),
          role: ["employee"],
          is_active: true,
        },
      });

      const employee = await prisma.employee.create({
        data: {
          user_id: createdUser.id,
          employee_id: body.employee_id ?? `EMP-${Date.now()}`,
          ...(body.manager_id && { manager_id: body.manager_id }),
          ...(body.notes && { notes: body.notes }),
          personal_details: {
            create: {
              first_name: body.first_name,
              last_name: body.last_name,
              email: body.email,
              ...(body.phone ? { phone: body.phone } : {}),
              ...(body.date_of_birth && {
                date_of_birth: new Date(body.date_of_birth),
              }),
              ...(body.gender && { gender: body.gender }),
              ...(body.marital_status && {
                marital_status: body.marital_status,
              }),
              ...(body.citizenship_number && {
                citizenship_number: body.citizenship_number,
              }),
              ...(body.pan_number && { pan_number: body.pan_number }),
              ...(body.nid_number && { nid_number: body.nid_number }),
              ...(body.ssid_number && { ssid_number: body.ssid_number }),
              ...(body.father_name && { father_name: body.father_name }),
              ...(body.mother_name && { mother_name: body.mother_name }),
              ...(body.grandfather_name && {
                grandfather_name: body.grandfather_name,
              }),
              ...(body.spouse_name && { spouse_name: body.spouse_name }),
              ...(body.current_address && {
                current_address: body.current_address,
              }),
              ...(body.permanent_address && {
                permanent_address: body.permanent_address,
              }),
              ...(body.country && { country: body.country }),
              ...(body.state && { state: body.state }),
              ...(body.district && { district: body.district }),
              ...(body.city && { city: body.city }),
              ...(municipality !== undefined && { municipality }),
              ...(body.ward !== undefined && { ward: Number(body.ward) }),
              ...(body.tole && { tole: body.tole }),
            },
          },
          department: {
            create: {
              department_name: body.department_name,
              joining_date: new Date(body.joining_date),
              ...(body.hierarchy && { hierarchy: body.hierarchy }),
              ...(body.previous_experience && {
                previous_experience: body.previous_experience,
              }),
              ...(body.employment_type && {
                employment_type: body.employment_type,
              }),
              ...(body.employment_status && {
                employment_status: body.employment_status,
              }),
              ...(body.position && { position: body.position }),
              ...(body.level && { level: body.level }),
            },
          },
          ...(body.salary !== undefined && {
            bank_details: {
              create: {
                account_number: body.account_number,
                salary: body.salary,
                bank_name: body.bank_name,
                branch: body.branch,
                ...(body.contract_type && {
                  contract_type: body.contract_type,
                }),
              },
            },
          }),
        },
        include: {
          user: true,
          personal_details: true,
          department: { orderBy: { joining_date: "desc" } },
          bank_details: true,
        },
      });

      await sendWelcomeEmail({
        to: body.email,
        name: `${body.first_name} ${body.last_name}`,
        employeeId: employee.employee_id,
        department: body.department_name,

        position: body.position ?? "",
        email: body.email,
        password: randomPassword,
      });

      res.status(201).json({
        success: true,
        message: "Employee created",
        data: employee,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /employees/:id ─────────────────────────────────────────────────
  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const body = req.body;

      const existing = await prisma.employee.findUnique({
        where: { id },
        include: { personal_details: true, bank_details: true },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const pd = body.personal_details ?? {};
      const bd = body.bank_details ?? {};
      const dept = body.department ?? {};

      // ── Personal details ────────────────────────────────────────────────
      const personalUpdate: any = {};

      if (body.personal_details !== undefined) {
        if (pd.municipality !== undefined) {
          try {
            personalUpdate.municipality = parseMunicipality(pd.municipality);
          } catch (e: any) {
            return res.status(400).json({ success: false, message: e.message });
          }
        }

        const personalFields = [
          "first_name",
          "last_name",
          "email",
          "phone",
          "date_of_birth",
          "gender",
          "marital_status",
          "citizenship_number",
          "pan_number",
          "nid_number",
          "ssid_number",
          "father_name",
          "mother_name",
          "grandfather_name",
          "spouse_name",
          "current_address",
          "permanent_address",
          "country",
          "state",
          "district",
          "city",
          "ward",
          "tole",
        ];

        for (const field of personalFields) {
          if (pd[field] !== undefined) {
            if (field === "date_of_birth" && pd[field]) {
              personalUpdate[field] = new Date(pd[field]);
            } else if (field === "ward") {
              personalUpdate[field] = Number(pd[field]);
            } else {
              personalUpdate[field] = pd[field];
            }
          }
        }

        const uniquePersonalFields = [
          "citizenship_number",
          "pan_number",
          "nid_number",
          "ssid_number",
          "email",
        ];
        if (existing.personal_details) {
          for (const field of uniquePersonalFields) {
            if (
              personalUpdate[field] !== undefined &&
              personalUpdate[field] ===
                (existing.personal_details as any)[field]
            ) {
              delete personalUpdate[field];
            }
          }
        }

        if (personalUpdate.email) {
          const emailConflict = await prisma.user.findFirst({
            where: {
              email: personalUpdate.email,
              NOT: { id: existing.user_id },
            },
          });
          if (emailConflict) {
            return res.status(400).json({
              success: false,
              message: "Email is already in use by another employee",
            });
          }
        }
        if (personalUpdate.citizenship_number) {
          const conflict = await prisma.personalDetail.findFirst({
            where: {
              citizenship_number: personalUpdate.citizenship_number,
              NOT: { employee_id: id },
            },
          });
          if (conflict) {
            return res.status(400).json({
              success: false,
              message: "Citizenship number already in use",
            });
          }
        }
        if (personalUpdate.pan_number) {
          const conflict = await prisma.personalDetail.findFirst({
            where: {
              pan_number: personalUpdate.pan_number,
              NOT: { employee_id: id },
            },
          });
          if (conflict) {
            return res
              .status(400)
              .json({ success: false, message: "PAN number already in use" });
          }
        }
      }

      // ── Bank details ────────────────────────────────────────────────────
      const bankUpdate: any = {};
      if (body.bank_details !== undefined) {
        for (const field of [
          "account_number",
          "salary",
          "bank_name",
          "branch",
          "contract_type",
        ]) {
          if (bd[field] !== undefined) {
            bankUpdate[field] =
              field === "salary" ? parseFloat(bd[field]) : bd[field];
          }
        }
      }

      // ── Department ──────────────────────────────────────────────────────
      const deptUpdate: any = {};
      if (body.department !== undefined) {
        for (const field of [
          "department_name",
          "joining_date",
          "hierarchy",
          "previous_experience",
          "employment_type",
          "employment_status",
          // FIX: schema field is `position`, not `designation`
          "position",
          "level",
        ]) {
          if (dept[field] !== undefined) {
            deptUpdate[field] =
              field === "joining_date" ? new Date(dept[field]) : dept[field];
          }
        }
      }

      const targetDeptId: string | undefined = dept.id;

      const [employee] = await prisma.$transaction(async (tx) => {
        if (
          pd.first_name ||
          pd.last_name ||
          body.is_active !== undefined ||
          personalUpdate.email
        ) {
          await tx.user.update({
            where: { id: existing.user_id },
            data: {
              ...(pd.first_name || pd.last_name
                ? {
                    name: `${pd.first_name ?? ""} ${pd.last_name ?? ""}`.trim(),
                  }
                : {}),
              ...(body.is_active !== undefined && {
                is_active: body.is_active,
              }),
              ...(personalUpdate.email && { email: personalUpdate.email }),
            },
          });
        }

        if (Object.keys(personalUpdate).length > 0) {
          await tx.personalDetail.upsert({
            where: { employee_id: id },
            update: personalUpdate,
            create: {
              employee_id: id,
              first_name:
                personalUpdate.first_name ??
                existing.personal_details?.first_name ??
                "",
              last_name:
                personalUpdate.last_name ??
                existing.personal_details?.last_name ??
                "",
              email:
                personalUpdate.email ?? existing.personal_details?.email ?? "",
              phone:
                personalUpdate.phone ??
                existing.personal_details?.phone ??
                null,
              ...personalUpdate,
            },
          });
        }

        if (Object.keys(bankUpdate).length > 0) {
          await tx.bankDetail.upsert({
            where: { employee_id: id },
            create: {
              employee_id: id,
              account_number: bankUpdate.account_number ?? "",
              salary: bankUpdate.salary ?? 0,
              bank_name: bankUpdate.bank_name ?? "",
              branch: bankUpdate.branch ?? "",
              ...bankUpdate,
            },
            update: bankUpdate,
          });
        }

        if (Object.keys(deptUpdate).length > 0) {
          let deptToUpdate: { id: string } | null = null;

          if (targetDeptId) {
            deptToUpdate = await tx.department.findFirst({
              where: { id: targetDeptId, employee_id: id },
              select: { id: true },
            });
          }
          if (!deptToUpdate) {
            deptToUpdate = await tx.department.findFirst({
              where: { employee_id: id },
              orderBy: { joining_date: "desc" },
              select: { id: true },
            });
          }
          if (deptToUpdate) {
            await tx.department.update({
              where: { id: deptToUpdate.id },
              data: deptUpdate,
            });
          }
        }

        const needsReverification =
          Object.keys(personalUpdate).length > 0 ||
          Object.keys(bankUpdate).length > 0 ||
          Object.keys(deptUpdate).length > 0;

        const updatedEmployee = await tx.employee.update({
          where: { id },
          data: {
            ...(body.manager_id !== undefined && {
              manager_id: body.manager_id,
            }),
            ...(body.notes !== undefined && { notes: body.notes }),
            ...(needsReverification && { employee_verified: false }),
          },
          include: {
            user: true,
            personal_details: true,
            department: { orderBy: { joining_date: "desc" } },
            bank_details: true,
            emergencyContacts: true,
            documents: true,
            assets: true,
            deviceMappings: {
              include: {
                device: {
                  select: {
                    serial_number: true,
                    device_name: true,
                    location: true,
                    is_active: true,
                  },
                },
              },
            },
          },
        });

        return [updatedEmployee];
      });

      res.json({ success: true, message: "Employee updated", data: employee });
    } catch (error: any) {
      console.error("Update employee error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── DELETE /employees/:id ────────────────────────────────────────────────
  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.findUnique({
        where: { id },
        select: { user_id: true },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      await prisma.user.delete({ where: { id: employee.user_id } });
      res.json({ success: true, message: "Employee deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── POST /employees/:id/verify ───────────────────────────────────────────
  static async verifyEmployee(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.update({
        where: { id },
        data: { employee_verified: true, verification_pending: false },
      });
      return res.json({
        success: true,
        message: "Employee verified successfully",
        data: employee,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── POST /employees/:id/profile-image ────────────────────────────────────
  static async uploadProfileImage(req: Request, res: Response<ApiResponse>) {
    try {
      const file = req.file;
      const { id } = req.params;
      if (!file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }
      if (!file.mimetype.startsWith("image/")) {
        return res
          .status(400)
          .json({ success: false, message: "Only image files allowed" });
      }

      await ensureBucket(EMPLOYEE_FILES_BUCKET);

      const fileName = `profile/${id}/${Date.now()}-${file.originalname}`;
      const fileUrl = `${MINIO_BASE_URL}/${EMPLOYEE_FILES_BUCKET}/${fileName}`;

      await minioClient.putObject(
        EMPLOYEE_FILES_BUCKET,
        fileName,
        file.buffer,
        file.size,
        { "Content-Type": file.mimetype },
      );

      const updated = await prisma.employee.update({
        where: { id },
        data: { profile_image: fileUrl },
      });

      return res.json({
        success: true,
        message: "Profile image uploaded",
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async startOffboarding(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id },
        include: {
          department: {
            orderBy: { joining_date: "desc" },
            take: 1,
            select: { id: true, employment_status: true },
          },
        },
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      const latestDept = employee.department[0];

      if (
        !latestDept ||
        latestDept.employment_status !== EmploymentStatus.active
      ) {
        return res.status(400).json({
          success: false,
          message: "Only active employees can be offboarded",
        });
      }

      const updated = await prisma.department.update({
        where: { id: latestDept.id },
        data: { employment_status: EmploymentStatus.notice_period },
      });

      await prisma.employee.update({
        where: { id },
        data: { employee_verified: false },
      });

      return res.json({
        success: true,
        message: "Employee moved to notice period",
        data: updated,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
