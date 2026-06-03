// controllers/profileUpdateRequest.controller.ts

import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse, JwtPayload } from "../types/index.js";
import { ProfileSection, RequestStatus } from "@prisma/client";

export class ProfileUpdateRequestController {
  // ── GET /profile-update-requests (HR: get all) ───────────────────────────
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const {
        status,
        section,
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const where: any = {
        ...(status && { status: status as RequestStatus }),
        ...(section && { section: section as ProfileSection }),
      };

      const [requests, total] = await Promise.all([
        prisma.profileUpdateRequest.findMany({
          where,
          skip,
          take,
          orderBy: { created_at: "desc" },
          include: {
            employee: {
              include: {
                personal_details: true,
                user: { select: { name: true, email: true } },
              },
            },
            reviewer: { select: { name: true, email: true } },
          },
        }),
        prisma.profileUpdateRequest.count({ where }),
      ]);

      res.json({
        success: true,
        message: "Profile update requests retrieved",
        data: requests,
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

  // ── GET /profile-update-requests/:id ────────────────────────────────────
  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const request = await prisma.profileUpdateRequest.findUnique({
        where: { id },
        include: {
          employee: {
            include: {
              personal_details: true,
              user: { select: { name: true, email: true } },
            },
          },
          reviewer: { select: { name: true, email: true } },
        },
      });

      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      res.json({
        success: true,
        message: "Profile update request retrieved",
        data: request,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /profile-update-requests/my (Employee: get own requests) ─────────
  static async getMy(req: Request, res: Response<ApiResponse>) {
    try {
      const user = req.user as JwtPayload;
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const {
        status,
        section,
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Use employeeId from token if available, otherwise look up
      let employeeId = user.employeeId;
      if (!employeeId) {
        const employee = await prisma.employee.findUnique({
          where: { user_id: user.userId },
          select: { id: true },
        });
        if (!employee) {
          return res
            .status(404)
            .json({ success: false, message: "Employee not found" });
        }
        employeeId = employee.id;
      }

      const where: any = {
        employee_id: employeeId,
        ...(status && { status: status as RequestStatus }),
        ...(section && { section: section as ProfileSection }),
      };

      const [requests, total] = await Promise.all([
        prisma.profileUpdateRequest.findMany({
          where,
          skip,
          take,
          orderBy: { created_at: "desc" },
          include: {
            reviewer: { select: { name: true, email: true } },
          },
        }),
        prisma.profileUpdateRequest.count({ where }),
      ]);

      res.json({
        success: true,
        message: "Your profile update requests retrieved",
        data: requests,
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

  // ── POST /profile-update-requests (Employee: submit request) ────────────
  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const user = req.user as JwtPayload;
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { section, requested_data } = req.body;

      if (!section || !requested_data) {
        return res.status(400).json({
          success: false,
          message: "section and requested_data are required",
        });
      }

      const validSections = Object.values(ProfileSection);
      if (!validSections.includes(section)) {
        return res.status(400).json({
          success: false,
          message: `Invalid section. Must be one of: ${validSections.join(", ")}`,
        });
      }

      let employeeId = user.employeeId;
      if (!employeeId) {
        const employee = await prisma.employee.findUnique({
          where: { user_id: user.userId },
          select: { id: true },
        });
        if (!employee) {
          return res
            .status(404)
            .json({ success: false, message: "Employee not found" });
        }
        employeeId = employee.id;
      }

      const request = await prisma.profileUpdateRequest.create({
        data: {
          employee_id: employeeId,
          section,
          requested_data,
          status: "pending",
        },
      });

      res.status(201).json({
        success: true,
        message: "Profile update request submitted successfully",
        data: request,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /profile-update-requests/:id/approve (HR) ─────────────────────
  static async approve(req: Request, res: Response<ApiResponse>) {
    try {
      const user = req.user as JwtPayload;
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { id } = req.params;
      const { reviewer_notes } = req.body;

      const request = await prisma.profileUpdateRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Request is already ${request.status}`,
        });
      }

      const data = request.requested_data as Record<string, any>;

      await prisma.$transaction(async (tx) => {
        switch (request.section) {
          case "personal": {
            const personalData: any = { ...data };
            if (personalData.date_of_birth) {
              personalData.date_of_birth = new Date(personalData.date_of_birth);
            }
            if (personalData.ward !== undefined) {
              personalData.ward = Number(personalData.ward);
            }

            await tx.personalDetail.upsert({
              where: { employee_id: request.employee_id },
              update: personalData,
              create: {
                employee_id: request.employee_id,
                first_name: personalData.first_name ?? "",
                last_name: personalData.last_name ?? "",
                email: personalData.email ?? "",
                ...personalData,
              },
            });

            if (
              personalData.first_name ||
              personalData.last_name ||
              personalData.email
            ) {
              const employee = await tx.employee.findUnique({
                where: { id: request.employee_id },
                select: {
                  user_id: true,
                  personal_details: {
                    select: { first_name: true, last_name: true },
                  },
                },
              });
              if (employee) {
                await tx.user.update({
                  where: { id: employee.user_id },
                  data: {
                    ...(personalData.first_name || personalData.last_name
                      ? {
                          name: `${personalData.first_name ?? employee.personal_details?.first_name ?? ""} ${personalData.last_name ?? employee.personal_details?.last_name ?? ""}`.trim(),
                        }
                      : {}),
                    ...(personalData.email && { email: personalData.email }),
                  },
                });
              }
            }
            break;
          }

          case "bank_details": {
            const bankData: any = { ...data };
            if (bankData.salary !== undefined) {
              bankData.salary = parseFloat(bankData.salary);
            }

            await tx.bankDetail.upsert({
              where: { employee_id: request.employee_id },
              update: bankData,
              create: {
                employee_id: request.employee_id,
                account_number: bankData.account_number ?? "",
                salary: bankData.salary ?? 0,
                bank_name: bankData.bank_name ?? "",
                branch: bankData.branch ?? "",
                ...bankData,
              },
            });
            break;
          }

          case "emergency": {
            if (!Array.isArray(data.contacts)) {
              throw new Error(
                "requested_data.contacts must be an array for emergency section",
              );
            }

            await tx.emergencyContact.deleteMany({
              where: { employee_id: request.employee_id },
            });

            await tx.emergencyContact.createMany({
              data: data.contacts.map((c: any) => ({
                employee_id: request.employee_id,
                name: c.name,
                relation: c.relation,
                phone: c.phone,
                ...(c.email && { email: c.email }),
              })),
            });
            break;
          }

          case "department": {
            const deptData: any = { ...data };
            if (deptData.joining_date) {
              deptData.joining_date = new Date(deptData.joining_date);
            }

            const latestDept = await tx.department.findFirst({
              where: { employee_id: request.employee_id },
              orderBy: { joining_date: "desc" },
              select: { id: true },
            });

            if (latestDept) {
              await tx.department.update({
                where: { id: latestDept.id },
                data: deptData,
              });
            } else {
              await tx.department.create({
                data: {
                  employee_id: request.employee_id,
                  department_name: deptData.department_name ?? "",
                  joining_date: deptData.joining_date ?? new Date(),
                  ...deptData,
                },
              });
            }
            break;
          }

          case "documents": {
            await tx.employeeDocument.create({
              data: {
                employee_id: request.employee_id,
                name: data.name ?? "",
                type: data.type ?? "",
                ...(data.status && { status: data.status }),
                ...(data.file_size && { file_size: data.file_size }),
                ...(data.file_url && { file_url: data.file_url }),
              },
            });
            break;
          }

          default:
            throw new Error(`Unhandled section: ${request.section}`);
        }

        await tx.profileUpdateRequest.update({
          where: { id },
          data: {
            status: "approved",
            reviewed_by: user.userId, // ✅ userId not id
            reviewed_at: new Date(),
            ...(reviewer_notes && { reviewer_notes }),
          },
        });

        await tx.employee.update({
          where: { id: request.employee_id },
          data: { employee_verified: false },
        });
      });

      res.json({
        success: true,
        message: "Profile update request approved and changes applied",
      });
    } catch (error: any) {
      console.error("Approve profile update error:", error);
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /profile-update-requests/:id/reject (HR) ──────────────────────
  static async reject(req: Request, res: Response<ApiResponse>) {
    try {
      const user = req.user as JwtPayload;
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { id } = req.params;
      const { reviewer_notes } = req.body;

      const request = await prisma.profileUpdateRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: `Request is already ${request.status}`,
        });
      }

      const updated = await prisma.profileUpdateRequest.update({
        where: { id },
        data: {
          status: "rejected",
          reviewed_by: user.userId, // ✅ userId not id
          reviewed_at: new Date(),
          ...(reviewer_notes && { reviewer_notes }),
        },
      });

      res.json({
        success: true,
        message: "Profile update request rejected",
        data: updated,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  // ── DELETE /profile-update-requests/:id (Employee: cancel pending) ───────
  static async cancel(req: Request, res: Response<ApiResponse>) {
    try {
      const user = req.user as JwtPayload;
      if (!user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { id } = req.params;

      let employeeId = user.employeeId;
      if (!employeeId) {
        const employee = await prisma.employee.findUnique({
          where: { user_id: user.userId },
          select: { id: true },
        });
        if (!employee) {
          return res
            .status(404)
            .json({ success: false, message: "Employee not found" });
        }
        employeeId = employee.id;
      }

      const request = await prisma.profileUpdateRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res
          .status(404)
          .json({ success: false, message: "Request not found" });
      }

      if (request.employee_id !== employeeId) {
        return res.status(403).json({
          success: false,
          message: "You can only cancel your own requests",
        });
      }

      if (request.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending requests can be cancelled",
        });
      }

      await prisma.profileUpdateRequest.delete({ where: { id } });

      res.json({
        success: true,
        message: "Profile update request cancelled",
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
