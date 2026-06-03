import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";
import * as XLSX from "xlsx";
import {
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
} from "@/utils/mailer.js";

function calcProRataTotal(
  joiningDate: Date,
  annualQuota: number,
  forYear: number,
): number {
  const now = new Date();

  const accrualStart = new Date(
    joiningDate.getFullYear(),
    joiningDate.getMonth() + 1,
    1,
  );

  const yearStart = new Date(forYear, 0, 1);
  const effectiveStart = accrualStart > yearStart ? accrualStart : yearStart;

  if (effectiveStart > now) return 0;

  const yearsD = now.getFullYear() - effectiveStart.getFullYear();
  const monthsD = now.getMonth() - effectiveStart.getMonth();
  const monthsAccrued = Math.max(0, yearsD * 12 + monthsD + 1);

  return Math.min(monthsAccrued, annualQuota);
}

function getLatestJoiningDate(
  departments: { joining_date: Date }[],
): Date | null {
  if (!departments.length) return null;
  return departments.reduce((latest, d) =>
    d.joining_date > latest.joining_date ? d : latest,
  ).joining_date;
}

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

      const leaves = await prisma.leave.findMany({
        where,
        include: {
          employee: {
            include: {
              user: true,
              personal_details: true,
              department: { orderBy: { joining_date: "desc" } },
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
      return res.status(500).json({ success: false, message: error.message });
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
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }

      const policy = await prisma.leavePolicy.findUnique({
        where: { id: leave_type_id },
      });
      if (!policy || !policy.active) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid leave type" });
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

      const overlap = await prisma.leave.findFirst({
        where: {
          employee_id,
          status: { not: "rejected" },
          OR: [{ start_date: { lte: endDate }, end_date: { gte: startDate } }],
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

      return res
        .status(201)
        .json({ success: true, message: "Leave request created", data: leave });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
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
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized user" });
      }

      const leaveWithDetails = await prisma.leave.findUnique({
        where: { id },
        include: {
          employee: { include: { user: true } },
          leaveType: true,
        },
      });
      if (!leaveWithDetails) {
        return res
          .status(404)
          .json({ success: false, message: "Leave not found" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const leave = await tx.leave.findUnique({ where: { id } });
        if (!leave) throw new Error("Leave not found");
        if (leave.status === "approved") throw new Error("Already approved");
        if (leave.status === "rejected")
          throw new Error("Cannot approve rejected leave");

        const policy = await tx.leavePolicy.findUnique({
          where: { id: leave.leave_type_id },
        });
        if (!policy) throw new Error("Leave policy not found");

        const year = new Date(leave.start_date).getFullYear();

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
          // FIX: joining_date lives on Department, not Employee
          const employee = await tx.employee.findUnique({
            where: { id: leave.employee_id },
            include: {
              department: { orderBy: { joining_date: "asc" }, take: 1 },
            },
          });
          if (!employee) throw new Error("Employee not found");

          const joiningDate = getLatestJoiningDate(employee.department);
          if (!joiningDate)
            throw new Error("Employee has no department/joining date");

          const total = policy.pro_rata
            ? calcProRataTotal(joiningDate, policy.annual_quota, year)
            : policy.annual_quota;

          balance = await tx.leaveBalance.create({
            data: {
              employee_id: leave.employee_id,
              year,
              leave_type_id: leave.leave_type_id,
              total,
              used: 0,
            },
          });
        }

        const remaining = balance.total - balance.used;
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

        await tx.leaveBalance.update({
          where: {
            employee_id_year_leave_type_id: {
              employee_id: leave.employee_id,
              year,
              leave_type_id: leave.leave_type_id,
            },
          },
          data: { used: { increment: leave.days_count } },
        });

        return updatedLeave;
      });

      const approver = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true },
      });

      await sendLeaveApprovedEmail({
        to: leaveWithDetails.employee.user.email,
        name: leaveWithDetails.employee.user.name,
        leaveType: leaveWithDetails.leaveType.name,
        startDate: leaveWithDetails.start_date.toLocaleDateString("en-US", {
          dateStyle: "long",
        }),
        endDate: leaveWithDetails.end_date.toLocaleDateString("en-US", {
          dateStyle: "long",
        }),
        totalDays: leaveWithDetails.days_count,
        reason: leaveWithDetails.reason ?? undefined,
        approvedBy: approver?.name ?? "HR",
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
  // REJECT LEAVE
  // =========================
  static async reject(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { approval_notes } = req.body;
      const user = req.user as any;

      if (!user?.userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized user" });
      }

      const existing = await prisma.leave.findUnique({
        where: { id },
        include: {
          employee: { include: { user: true } },
          leaveType: true,
        },
      });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Leave not found" });
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

      const rejector = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true },
      });

      await sendLeaveRejectedEmail({
        to: existing.employee.user.email,
        name: existing.employee.user.name,
        leaveType: existing.leaveType.name,
        startDate: existing.start_date.toLocaleDateString("en-US", {
          dateStyle: "long",
        }),
        endDate: existing.end_date.toLocaleDateString("en-US", {
          dateStyle: "long",
        }),
        totalDays: existing.days_count,
        reason: existing.reason ?? undefined,
        rejectedBy: rejector?.name ?? "HR",
        rejectionReason: approval_notes || undefined,
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

      const leave = await prisma.leave.findUnique({ where: { id } });
      if (!leave) {
        return res
          .status(404)
          .json({ success: false, message: "Leave not found" });
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
            data: { used: newUsed },
          });
        }
      }

      await prisma.leave.delete({ where: { id } });
      return res.json({ success: true, message: "Leave deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =========================
  // GET LEAVE BALANCE (single employee)
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

      // FIX: joining_date lives on Department, not Employee
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          department: {
            orderBy: { joining_date: "asc" },
            take: 1,
            select: { joining_date: true },
          },
        },
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: "Employee not found",
        });
      }

      const joiningDate = employee.department[0]?.joining_date ?? null;

      const policies = await prisma.leavePolicy.findMany({
        where: { active: true },
      });

      const balances = await prisma.leaveBalance.findMany({
        where: { employee_id: employeeId, year },
      });

      const result = policies.map((policy) => {
        const balance = balances.find((b) => b.leave_type_id === policy.id);
        const used = Number(balance?.used ?? 0);

        let accrued: number;
        if (balance) {
          accrued = Number(balance.total);
        } else if (policy.pro_rata && joiningDate) {
          accrued = calcProRataTotal(
            new Date(joiningDate),
            policy.annual_quota,
            year,
          );
        } else {
          accrued = policy.annual_quota;
        }

        const total = accrued;

        return {
          leave_type: policy.name,
          leave_type_id: policy.id,
          accrued,
          total,
          used,
          remaining: accrued - used,
          is_pro_rata: policy.pro_rata,
        };
      });

      return res.json({
        success: true,
        message: "Leave balance fetched",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =========================
  // GET ALL BALANCES (HR view)
  // =========================
  static async getAllLeaveBalances(req: Request, res: Response<ApiResponse>) {
    try {
      const year = new Date().getFullYear();

      const employees = await prisma.employee.findMany({
        include: {
          personal_details: { select: { first_name: true, last_name: true } },
          department: { orderBy: { joining_date: "desc" } },
        },
      });

      const policies = await prisma.leavePolicy.findMany({
        where: { active: true },
      });

      const balances = await prisma.leaveBalance.findMany({
        where: { year },
      });

      const result = employees.flatMap((employee) =>
        policies.map((policy) => {
          const balance = balances.find(
            (b) =>
              b.employee_id === employee.id && b.leave_type_id === policy.id,
          );

          const used = Number(balance?.used ?? 0);

          const joiningDate = employee.department.length
            ? employee.department[employee.department.length - 1].joining_date
            : null;

          let total: number;
          if (balance) {
            total = Number(balance.total);
          } else if (policy.pro_rata && joiningDate) {
            total = calcProRataTotal(
              new Date(joiningDate),
              policy.annual_quota,
              year,
            );
          } else {
            total = policy.annual_quota;
          }

          return {
            employee_id: employee.id,
            employee: {
              id: employee.id,
              first_name: employee.personal_details?.first_name ?? "",
              last_name: employee.personal_details?.last_name ?? "",
              department: employee.department[0]?.department_name ?? "",
            },
            leave_type: policy.name,
            leave_type_id: policy.id,
            total,
            used,
            remaining: total - used,
          };
        }),
      );

      return res.json({
        success: true,
        message: "All leave balances fetched",
        data: result,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch leave balances",
      });
    }
  }

  // =========================
  // UPDATE LEAVE BALANCE (customize quota)
  // =========================
  static async updateLeaveBalance(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id, leave_type_id, total, reason } = req.body;

      if (!employee_id || !leave_type_id || total == null) {
        return res.status(400).json({
          success: false,
          message: "employee_id, leave_type_id, and total are required",
        });
      }

      const totalNum = Number(total);
      if (isNaN(totalNum)) {
        return res.status(400).json({
          success: false,
          message: "total must be a valid number",
        });
      }

      const policy = await prisma.leavePolicy.findUnique({
        where: { id: leave_type_id },
      });
      if (!policy) {
        return res
          .status(404)
          .json({ success: false, message: "Leave policy not found" });
      }

      // FIX: include personal_details and department for the response shape
      const employee = await prisma.employee.findUnique({
        where: { id: employee_id },
        include: {
          personal_details: { select: { first_name: true, last_name: true } },
          department: { orderBy: { joining_date: "desc" }, take: 1 },
        },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const year = new Date().getFullYear();

      const balance = await prisma.leaveBalance.upsert({
        where: {
          employee_id_year_leave_type_id: { employee_id, year, leave_type_id },
        },
        update: { total: totalNum },
        create: {
          employee_id,
          year,
          leave_type_id,
          total: totalNum,
          used: 0,
        },
      });

      const used = Number(balance.used ?? 0);
      const newTotal = Number(balance.total ?? 0);

      return res.json({
        success: true,
        message: "Leave balance updated",
        data: {
          id: balance.id,
          employee_id: balance.employee_id,
          employee: {
            id: employee.id,
            // FIX: first_name/last_name from personal_details, department name from array
            first_name: employee.personal_details?.first_name ?? "",
            last_name: employee.personal_details?.last_name ?? "",
            department: employee.department[0]?.department_name ?? "",
          },
          leave_type: policy.name,
          leave_type_id: balance.leave_type_id,
          total: newTotal,
          used,
          remaining: newTotal - used,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =========================
  // GET LEAVES BY EMPLOYEE ID
  // =========================
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
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =========================
  // UPDATE LEAVE
  // =========================
  static async updateLeave(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { start_date, end_date, leave_type_id, reason } = req.body;

      const leave = await prisma.leave.findUnique({ where: { id } });
      if (!leave) {
        return res
          .status(404)
          .json({ success: false, message: "Leave not found" });
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
        return res
          .status(400)
          .json({ success: false, message: "Invalid date range" });
      }

      if (leave_type_id) {
        const policy = await prisma.leavePolicy.findUnique({
          where: { id: leave_type_id },
        });
        if (!policy) {
          return res
            .status(400)
            .json({ success: false, message: "Invalid leave type" });
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
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // =========================
  // EXPORT LEAVES TO EXCEL
  // =========================
  static async exportLeaves(req: Request, res: Response) {
    try {
      const { month, leave_type, employee, status } = req.query;

      const where: any = {};

      if (month && month !== "all") {
        const m = parseInt(month as string);
        const year = new Date().getFullYear();
        where.start_date = {
          gte: new Date(year, m, 1),
          lte: new Date(year, m + 1, 0, 23, 59, 59),
        };
      }

      if (leave_type && leave_type !== "all") {
        where.leaveType = { name: leave_type as string };
      }

      if (employee && employee !== "all") {
        where.employee = { user: { name: employee as string } };
      }

      if (status && status !== "all") {
        where.status = status as string;
      }

      const leaves = await prisma.leave.findMany({
        where,
        orderBy: { created_at: "desc" },
        include: {
          employee: {
            include: {
              user: true,
              // FIX: include department to get department_name
              department: { orderBy: { joining_date: "desc" }, take: 1 },
            },
          },
          leaveType: true,
        },
      });

      const approverIds = [
        ...new Set(
          leaves.map((l) => l.approved_by).filter(Boolean) as string[],
        ),
      ];

      const approvers = approverIds.length
        ? await prisma.user.findMany({
            where: { id: { in: approverIds } },
            select: { id: true, name: true },
          })
        : [];

      const approverMap = Object.fromEntries(
        approvers.map((u) => [u.id, u.name]),
      );

      const data = leaves.map((l) => ({
        Employee: l.employee.user.name,
        // FIX: department is an array — get the most recent department_name
        Department: l.employee.department[0]?.department_name ?? "—",
        LeaveType: l.leaveType.name,
        FromDate: new Date(l.start_date).toISOString().split("T")[0],
        ToDate: new Date(l.end_date).toISOString().split("T")[0],
        Days: l.days_count,
        Status: l.status,
        Reason: l.reason ?? "—",
        AppliedOn: new Date(l.created_at).toISOString().split("T")[0],
        ApprovedBy: l.approved_by ? (approverMap[l.approved_by] ?? "—") : "—",
        RejectionReason:
          l.status === "rejected" ? (l.approval_notes ?? "—") : "—",
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Requests");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=leave-requests.xlsx",
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.send(buffer);
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Export failed" });
    }
  }
}
