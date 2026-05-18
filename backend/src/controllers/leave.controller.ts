import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";

export class LeaveController {
  // =========================
  // GET ALL LEAVES
  // =========================
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id, status } = req.query;

      const where: any = {};
      if (employee_id) where.employee_id = employee_id;
      if (status) where.status = status;

      // src/controllers/leave.controller.ts

      // Inside the getAll method:
      // backend/src/controllers/leave.controller.ts

      const leaves = await prisma.leave.findMany({
        where,
        include: {
          employee: {
            include: {
              user: true, // Names are likely here: user.name or user.first_name
            },
          },
          leaveType: true,
        },
        orderBy: { created_at: "desc" },
      });

      return res.json({
        success: true,
        message: "Leaves retrieved",
        data: leaves,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // =========================
  // CREATE LEAVE
  // =========================
  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id, start_date, end_date, leave_type_id, reason } =
        req.body;

      if (!employee_id || !start_date || !end_date || !leave_type_id) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // Validate leave policy
      const policy = await prisma.leavePolicy.findUnique({
        where: { id: leave_type_id },
      });

      if (!policy || !policy.active) {
        return res.status(400).json({
          success: false,
          message: "Invalid leave type",
        });
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: "End date cannot be before start date",
        });
      }

      const daysCount =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;

      // Overlap check
      const overlap = await prisma.leave.findFirst({
        where: {
          employee_id,
          status: { not: "rejected" },
          OR: [
            {
              start_date: { lte: endDate },
              end_date: { gte: startDate },
            },
          ],
        },
      });

      if (overlap) {
        return res.status(400).json({
          success: false,
          message: "Leave overlaps with existing leave",
        });
      }

      const leave = await prisma.leave.create({
        data: {
          employee_id,
          start_date: startDate,
          end_date: endDate,
          leave_type_id,
          days_count: daysCount,
          reason,
          status: "pending",
        },
        include: {
          employee: { include: { user: true } },
          leaveType: true,
        },
      });

      return res.status(201).json({
        success: true,
        message: "Leave request created",
        data: leave,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // =========================
  // APPROVE LEAVE
  // =========================
  static async approve(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { approval_notes } = req.body;
      const user = req.user as any;

      if (!user?.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        const leave = await tx.leave.findUnique({
          where: { id },
        });

        if (!leave) throw new Error("Leave not found");
        if (leave.status === "approved") throw new Error("Already approved");
        if (leave.status === "rejected")
          throw new Error("Cannot approve rejected leave");

        const policy = await tx.leavePolicy.findUnique({
          where: { id: leave.leave_type_id },
        });

        if (!policy) throw new Error("Leave policy not found");

        const year = new Date(leave.start_date).getFullYear();

        // ✅ FIX 1: ensure balance exists
        let balance = await tx.leaveBalance.findUnique({
          where: {
            employee_id_year_leave_type_id: {
              employee_id: leave.employee_id,
              year,
              leave_type_id: leave.leave_type_id,
            },
          },
        });

        if (!balance) {
          balance = await tx.leaveBalance.create({
            data: {
              employee_id: leave.employee_id,
              year,
              leave_type_id: leave.leave_type_id,
              total: policy.annual_quota,
              used: 0,
              remaining: policy.annual_quota,
            },
          });
        }

        // normalize remaining
        const remaining = balance.total - balance.used;

        // ❗ FIX 2: proper validation
        if (leave.days_count > remaining) {
          throw new Error(
            `Insufficient leave balance. Remaining: ${remaining}, Requested: ${leave.days_count}`,
          );
        }

        const updatedLeave = await tx.leave.update({
          where: { id },
          data: {
            status: "approved",
            approved_by: user.userId,
            approval_notes: approval_notes || null,
          },
        });

        // FIX 3: safe update
        await tx.leaveBalance.update({
          where: {
            employee_id_year_leave_type_id: {
              employee_id: leave.employee_id,
              year,
              leave_type_id: leave.leave_type_id,
            },
          },
          data: {
            used: { increment: leave.days_count },
            remaining: { decrement: leave.days_count },
          },
        });

        return updatedLeave;
      });

      return res.json({
        success: true,
        message: "Leave approved successfully",
        data: result,
      });
    } catch (error: any) {
      console.error("APPROVE ERROR:", error);

      return res.status(400).json({
        success: false,
        message: error.message || "Failed to approve leave",
      });
    }
  }

  // =========================
  // REJECT LEAVE (FIXED 500 ISSUE)
  // =========================
  static async reject(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { approval_notes } = req.body;
      const user = req.user as any;

      if (!user?.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const existing = await prisma.leave.findUnique({
        where: { id },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Leave not found",
        });
      }

      if (existing.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending leave can be rejected",
        });
      }

      const leave = await prisma.leave.update({
        where: { id },
        data: {
          status: "rejected",
          approved_by: user.userId,
          approval_notes: approval_notes || "No reason provided",
        },
      });

      return res.json({
        success: true,
        message: "Leave rejected",
        data: leave,
      });
    } catch (error: any) {
      console.error("REJECT ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // =========================
  // DELETE LEAVE
  // =========================
  static async deleteLeave(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const leave = await prisma.leave.findUnique({
        where: { id },
      });

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave not found",
        });
      }

      if (leave.status === "approved") {
        const year = new Date(leave.start_date).getFullYear();

        const balance = await prisma.leaveBalance.findUnique({
          where: {
            employee_id_year_leave_type_id: {
              employee_id: leave.employee_id,
              year,
              leave_type_id: leave.leave_type_id,
            },
          },
        });

        if (balance) {
          const newUsed = Math.max(0, balance.used - leave.days_count);

          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: {
              used: newUsed,
              remaining: balance.total - newUsed,
            },
          });
        }
      }

      await prisma.leave.delete({ where: { id } });

      return res.json({
        success: true,
        message: "Leave deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // =========================
  // GET LEAVE BALANCE
  // =========================
  static async getLeaveBalance(req: Request, res: Response<ApiResponse>) {
    try {
      const employeeId =
        (req.params.employee_id as string) ||
        (req.query.employee_id as string) ||
        req.user?.employeeId;

      if (!employeeId) {
        return res.status(400).json({
          success: false,
          message: "Employee ID required",
        });
      }

      const year = new Date().getFullYear();

      const policies = await prisma.leavePolicy.findMany({
        where: { active: true },
      });

      const balances = await prisma.leaveBalance.findMany({
        where: { employee_id: employeeId, year },
        include: {
          leavePolicy: true,
        },
      });
      const result = policies.map((policy) => {
        const balance = balances.find((b) => b.leave_type_id === policy.id);

        return {
          leave_type: policy.name,
          total: balance?.total ?? policy.annual_quota,
          used: balance?.used ?? 0,
          remaining: balance?.remaining ?? policy.annual_quota,
        };
      });

      return res.json({
        success: true,
        message: "Leave balance fetched",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // =========================
  // GET ALL BALANCES
  // =========================
  static async getAllLeaveBalances(req: Request, res: Response) {
    try {
      const balances = await prisma.leaveBalance.findMany({
        include: {
          employee: {
            select: {
              id: true,
              department: true,
              personal_details: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
          leavePolicy: true,
        },
      });

      return res.json({
        success: true,
        data: balances,
      });
    } catch {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch leave balances",
      });
    }
  }
  // =========================
  // GET LEAVES BY EMPLOYEE ID

  static async getByEmployee(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId } = req.params;
      const requestingUser = req.user as any;

      if (requestingUser.role === "employee") {
        const employee = await prisma.employee.findUnique({
          where: { user_id: requestingUser.userId },
        });

        if (!employee || employee.id !== employeeId) {
          return res.status(403).json({
            success: false,
            message: "You can only view your own leaves",
          });
        }
      }

      const leaves = await prisma.leave.findMany({
        where: { employee_id: employeeId },
        include: {
          employee: { include: { user: true } },
          leaveType: true,
        },
        orderBy: { created_at: "desc" },
      });

      return res.json({
        success: true,
        message: "Employee leaves retrieved",
        data: leaves,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // =========================
  // UPDATE LEAVE
  // =========================
  static async updateLeave(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { start_date, end_date, leave_type_id, reason } = req.body;

      const leave = await prisma.leave.findUnique({
        where: { id },
      });

      if (!leave) {
        return res.status(404).json({
          success: false,
          message: "Leave not found",
        });
      }

      if (leave.status !== "pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending leaves can be updated",
        });
      }

      const start = new Date(start_date);
      const end = new Date(end_date);

      if (end < start) {
        return res.status(400).json({
          success: false,
          message: "Invalid date range",
        });
      }

      if (leave_type_id) {
        const policy = await prisma.leavePolicy.findUnique({
          where: { id: leave_type_id },
        });

        if (!policy) {
          return res.status(400).json({
            success: false,
            message: "Invalid leave type",
          });
        }
      }

      const days_count =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;

      const updated = await prisma.leave.update({
        where: { id },
        data: {
          start_date: start,
          end_date: end,
          leave_type_id: leave_type_id ?? leave.leave_type_id,
          reason: reason ?? leave.reason,
          days_count,
        },
      });

      return res.json({
        success: true,
        message: "Leave updated",
        data: updated,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
