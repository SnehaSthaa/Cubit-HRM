import { Request, Response } from "express";
import { prisma } from "@/db/prisma";
import { EmploymentStatus } from "@prisma/client";

export class OffboardingController {
  static async startOffboarding(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({ where: { id } });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      if (employee.employment_status !== EmploymentStatus.active) {
        return res.status(400).json({
          success: false,
          message: "Only active employees can be offboarded",
        });
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: {
          employment_status: EmploymentStatus.notice_period,
          employee_verified: false,
        },
      });

      return res.json({
        success: true,
        message: "Employee moved to notice period",
        data: updated,
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  // GET /offboarding — all employees on notice_period or resigned
  static async getOffboardingEmployees(req: Request, res: Response) {
    try {
      const employees = await prisma.employee.findMany({
        where: {
          employment_status: {
            in: [EmploymentStatus.notice_period, EmploymentStatus.resigned],
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updated_at: "desc" },
      });

      return res.json({ success: true, data: employees });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // PATCH /offboarding/:id/complete — mark as resigned
  static async completeOffboarding(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({ where: { id } });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      if (employee.employment_status !== EmploymentStatus.notice_period) {
        return res.status(400).json({
          success: false,
          message: "Only employees on notice period can be completed",
        });
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: { employment_status: EmploymentStatus.resigned },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      return res.json({
        success: true,
        message: "Offboarding completed — employee marked as resigned",
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
