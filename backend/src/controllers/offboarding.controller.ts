import { Request, Response } from "express";
import { prisma } from "@/db/prisma";
import { EmploymentStatus } from "@prisma/client";
import { tr } from "zod/locales";

export class OffboardingController {
  static async startOffboarding(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id },
        include: { department: true },
      });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const activeDept = employee.department.find(
        (d) => d.employment_status === EmploymentStatus.active,
      );

      if (!activeDept) {
        return res.status(400).json({
          success: false,
          message: "Department not found for employee",
        });
      }

      const updated = await prisma.department.update({
        where: { id: activeDept.id },
        data: { employment_status: EmploymentStatus.notice_period },
        include: {
          employee: {
            select: {
              employee_verified: false,
            },
          },
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

  static async getOffboardingEmployees(req: Request, res: Response) {
    try {
      const employees = await prisma.employee.findMany({
        where: {
          department: {
            some: {
              employment_status: {
                in: [EmploymentStatus.notice_period, EmploymentStatus.resigned],
              },
            },
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          department: true,
          personal_details: true,
        },
        orderBy: { updated_at: "desc" },
      });

      return res.json({
        success: true,
        data: employees.map((emp) => {
          const activeDept =
            emp.department.find(
              (d) => d.employment_status === EmploymentStatus.notice_period,
            ) ??
            emp.department.find(
              (d) => d.employment_status === EmploymentStatus.resigned,
            );

          return {
            ...(emp.personal_details ?? {}),
            id: emp.id,
            employee_id: emp.employee_id,
            updated_at: emp.updated_at.toISOString(),
            profile_image: emp.profile_image ?? "",
            user: emp.user,
            department: activeDept?.department_name ?? "",
            position: activeDept?.position ?? "",
            employment_status: activeDept?.employment_status ?? "",
            joining_date: activeDept?.joining_date?.toISOString() ?? "",
          };
        }),
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  static async completeOffboarding(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const employee = await prisma.employee.findUnique({
        where: { id },
        include: { department: true },
      });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const noticeDept = employee.department.find(
        (d) => d.employment_status === EmploymentStatus.notice_period,
      );

      if (!noticeDept) {
        return res.status(400).json({
          success: false,
          message: "Department not found",
        });
      }

      const updated = await prisma.department.update({
        where: { id: noticeDept.id },
        data: { employment_status: EmploymentStatus.resigned },
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
