import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse, Attendance } from "../types/index.js";

export class AttendanceController {
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id, date, status } = req.query;
      const where: any = {};

      if (employee_id) where.employee_id = employee_id;
      if (date) where.date = new Date(date as string);
      if (status) where.status = status;

      const records = await prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      res.json({
        success: true,
        message: "Attendance records retrieved",
        data: records,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const record = await prisma.attendance.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
        },
      });

      if (!record) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }

      res.json({
        success: true,
        message: "Attendance record retrieved",
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const attendanceData: Partial<Attendance> = req.body;

      if (
        !attendanceData.employee_id ||
        !attendanceData.date ||
        !attendanceData.status
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      const record = await prisma.attendance.create({
        data: {
          employee_id: attendanceData.employee_id,
          date: new Date(attendanceData.date),
          check_in: attendanceData.check_in
            ? new Date(`1970-01-01T${attendanceData.check_in}`)
            : null,
          check_out: attendanceData.check_out
            ? new Date(`1970-01-01T${attendanceData.check_out}`)
            : null,
          status: attendanceData.status,
          notes: attendanceData.notes,
        },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Attendance record created",
        data: record,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({
          success: false,
          message:
            "Attendance record already exists for this employee on this date",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const record = await prisma.attendance.update({
        where: { id },
        data: {
          ...(updateData.check_in && {
            check_in: new Date(`1970-01-01T${updateData.check_in}`),
          }),
          ...(updateData.check_out && {
            check_out: new Date(`1970-01-01T${updateData.check_out}`),
          }),
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.notes !== undefined && { notes: updateData.notes }),
        },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Attendance record updated",
        data: record,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async checkIn(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id } = req.body;

      if (!employee_id) {
        return res.status(400).json({
          success: false,
          message: "Employee ID is required",
        });
      }

      const today = new Date();
      const todayString = today.toISOString().split("T")[0];

      // Check if already checked in today
      const existing = await prisma.attendance.findFirst({
        where: {
          employee_id,
          date: new Date(todayString),
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Already checked in today",
        });
      }

      const checkInTime = new Date();
      const record = await prisma.attendance.create({
        data: {
          employee_id,
          date: new Date(todayString),
          check_in: checkInTime,
          status: "present",
        },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: "Checked in successfully",
        data: record,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async checkOut(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id } = req.body;

      if (!employee_id) {
        return res.status(400).json({
          success: false,
          message: "Employee ID is required",
        });
      }

      const today = new Date();
      const todayString = today.toISOString().split("T")[0];

      const record = await prisma.attendance.updateMany({
        where: {
          employee_id,
          date: new Date(todayString),
        },
        data: {
          check_out: today,
        },
      });

      if (record.count === 0) {
        return res.status(404).json({
          success: false,
          message: "No attendance record found for today",
        });
      }

      // Get the updated record
      const updatedRecord = await prisma.attendance.findFirst({
        where: {
          employee_id,
          date: new Date(todayString),
        },
        include: {
          employee: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
        },
      });

      res.json({
        success: true,
        message: "Checked out successfully",
        data: updatedRecord,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async getEmployeeAttendance(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id } = req.params;
      const { month, year } = req.query;

      const where: any = { employee_id };

      if (month && year) {
        const startDate = new Date(
          parseInt(year as string),
          parseInt(month as string) - 1,
          1,
        );
        const endDate = new Date(
          parseInt(year as string),
          parseInt(month as string),
          0,
        );
        where.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      const records = await prisma.attendance.findMany({
        where,
        orderBy: {
          date: "asc",
        },
      });

      res.json({
        success: true,
        message: "Employee attendance retrieved",
        data: records,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      await prisma.attendance.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Attendance record deleted",
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
        });
      }
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
