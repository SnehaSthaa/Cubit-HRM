import { Request, Response } from "express";
import {
  AttendanceStatus,
  AttendanceRequestType,
  AttendanceRequestStatus,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";

// ── Constants ────────────────────────────────────────────────────────────────

// Nepal is UTC+5:45
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

// ── Shared includes ──────────────────────────────────────────────────────────

const employeeInclude = {
  personal_details: {
    select: {
      first_name: true,
      last_name: true,
      email: true,
      phone: true,
    },
  },
} as const;

const fullRequestInclude = {
  employee: { include: employeeInclude },
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts an "HH:MM" or "HH:MM:SS" Nepal local time string into a
 * fake-UTC Date for DB storage, consistent with the attendance controller.
 * Returns null for empty / invalid input.
 */
function parseTimeString(
  hhmm: string | null | undefined,
  dateContext: Date,
): Date | null {
  if (!hhmm?.trim()) return null;

  const trimmed = hhmm.trim();
  const normalized = trimmed.length === 5 ? `${trimmed}:00` : trimmed;
  const [h, m, s] = normalized.split(":").map(Number);

  if (isNaN(h) || isNaN(m)) return null;

  return new Date(
    dateContext.getTime() + h * 3_600_000 + m * 60_000 + (s ?? 0) * 1_000,
  );
}

/**
 * Ensures a sentinel "MANUAL" device exists for attendance records
 * created during approval when no existing record is found.
 */
async function ensureManualDevice(): Promise<string> {
  const existing = await prisma.device.findUnique({
    where: { serial_number: "MANUAL" },
  });
  if (existing) return existing.serial_number;

  const created = await prisma.device.create({
    data: {
      serial_number: "MANUAL",
      device_name: "Manual Entry",
      device_model: "N/A",
      ip: "0.0.0.0",
      is_active: false,
    },
  });
  return created.serial_number;
}

// ── Controller ───────────────────────────────────────────────────────────────

export class AttendanceRequestController {
  // ── POST /attendance/requests ────────────────────────────────────────
  // Employee submits a new attendance correction request
  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const employee_id = req.user?.employeeId;
      if (!employee_id) {
        return res.status(403).json({
          success: false,
          message:
            "No employee profile linked to this account. Please contact HR.",
        });
      }

      const {
        date,
        request_type,
        requested_check_in,
        requested_check_out,
        requested_status,
        reason,
      } = req.body;

      // ── Required field validation ──────────────────────────────────
      if (!date || !request_type || !reason?.trim()) {
        return res.status(400).json({
          success: false,
          message: "date, request_type, and reason are required",
        });
      }

      if (!["check_in", "check_out", "both"].includes(request_type)) {
        return res.status(400).json({
          success: false,
          message: "request_type must be one of: check_in, check_out, both",
        });
      }

      // ── Per-type time field validation ─────────────────────────────
      if (
        (request_type === "check_in" || request_type === "both") &&
        !requested_check_in?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "requested_check_in is required for this request type",
        });
      }

      if (
        (request_type === "check_out" || request_type === "both") &&
        !requested_check_out?.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "requested_check_out is required for this request type",
        });
      }

      // ── Validate employee exists ───────────────────────────────────
      const employee = await prisma.employee.findUnique({
        where: { id: employee_id },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const dateContext = new Date(date);

      // ── Block duplicate pending request for same day ───────────────
      const duplicate = await prisma.attendanceRequest.findFirst({
        where: { employee_id, date: dateContext, status: "pending" },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "You already have a pending request for this date",
        });
      }

      // ── Build and validate time values ─────────────────────────────
      const checkInTime = parseTimeString(requested_check_in, dateContext);
      const checkOutTime = parseTimeString(requested_check_out, dateContext);

      if (checkInTime && checkOutTime && checkOutTime <= checkInTime) {
        return res.status(400).json({
          success: false,
          message: "requested_check_out must be after requested_check_in",
        });
      }

      // ── Create the request ─────────────────────────────────────────
      const request = await prisma.attendanceRequest.create({
        data: {
          employee_id,
          date: dateContext,
          request_type: request_type as AttendanceRequestType,
          requested_check_in: checkInTime,
          requested_check_out: checkOutTime,
          requested_status: requested_status
            ? (requested_status as AttendanceStatus)
            : null,
          reason: reason.trim(),
        },
        include: fullRequestInclude,
      });

      res.status(201).json({
        success: true,
        message: "Attendance request submitted successfully",
        data: request,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /attendance/requests/me ──────────────────────────────────────
  // Employee views their own requests
  static async getMyRequests(req: Request, res: Response<ApiResponse>) {
    try {
      const employee_id = req.user?.employeeId;
      if (!employee_id) {
        return res.status(403).json({
          success: false,
          message: "No employee profile linked to this account.",
        });
      }

      const {
        status,
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      const where: any = { employee_id };
      if (status) where.status = status as AttendanceRequestStatus;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [requests, total] = await Promise.all([
        prisma.attendanceRequest.findMany({
          where,
          skip,
          take,
          orderBy: { created_at: "desc" },
          include: fullRequestInclude,
        }),
        prisma.attendanceRequest.count({ where }),
      ]);

      res.json({
        success: true,
        message: "Your attendance requests retrieved",
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

  // ── GET /attendance/requests ─────────────────────────────────────────
  // HR/admin views all requests with optional filters
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const {
        status,
        employee_id,
        from_date,
        to_date,
        request_type,
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      const where: any = {};
      if (status) where.status = status as AttendanceRequestStatus;
      if (employee_id) where.employee_id = employee_id;
      if (request_type)
        where.request_type = request_type as AttendanceRequestType;
      if (from_date || to_date) {
        where.date = {};
        if (from_date) where.date.gte = new Date(from_date);
        if (to_date) where.date.lte = new Date(to_date);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [requests, total] = await Promise.all([
        prisma.attendanceRequest.findMany({
          where,
          skip,
          take,
          orderBy: { created_at: "desc" },
          include: fullRequestInclude,
        }),
        prisma.attendanceRequest.count({ where }),
      ]);

      res.json({
        success: true,
        message: "Attendance requests retrieved",
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

  // ── GET /attendance/requests/:id ─────────────────────────────────────
  // HR/admin or the employee themselves views a single request
  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const request = await prisma.attendanceRequest.findUnique({
        where: { id },
        include: fullRequestInclude,
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Attendance request not found",
        });
      }

      // Employees can only view their own requests
      const employee_id = req.user?.employeeId;
      const role = req.user?.role;
      if (
        role === "employee" &&
        employee_id &&
        request.employee_id !== employee_id
      ) {
        return res.status(403).json({
          success: false,
          message: "You are not allowed to view this request",
        });
      }

      res.json({
        success: true,
        message: "Attendance request retrieved",
        data: request,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /attendance/requests/:id/approve ───────────────────────────
  // HR/admin approves and applies changes to the attendance record
  static async approve(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { reviewer_notes } = req.body;
      const reviewed_by = req.user?.userId;

      const request = await prisma.attendanceRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Attendance request not found",
        });
      }

      if (request.status !== "pending") {
        return res.status(409).json({
          success: false,
          message: `Request has already been ${request.status}`,
        });
      }

      const dateContext = request.date; // already fake-UTC Nepal midnight

      // ── Build attendance update payload ────────────────────────────
      const attendanceData: any = {};

      if (
        request.request_type === "check_in" ||
        request.request_type === "both"
      ) {
        attendanceData.check_in = request.requested_check_in;
      }

      if (
        request.request_type === "check_out" ||
        request.request_type === "both"
      ) {
        attendanceData.check_out = request.requested_check_out;
      }

      if (request.requested_status) {
        attendanceData.status = request.requested_status;
      }

      attendanceData.notes = reviewer_notes
        ? `Correction approved by HR: ${reviewer_notes}`
        : "Correction approved by HR";

      // ── Apply to attendance + mark request approved in a transaction
      const [updatedRequest, updatedAttendance] = await prisma.$transaction(
        async (tx) => {
          // Check if an attendance record exists for this employee + date
          const existingAttendance = await tx.attendance.findUnique({
            where: {
              employee_id_date: {
                employee_id: request.employee_id,
                date: dateContext,
              },
            },
          });

          let attendance;

          if (existingAttendance) {
            // Update existing attendance record
            attendance = await tx.attendance.update({
              where: { id: existingAttendance.id },
              data: attendanceData,
            });
          } else {
            // No record for that day — create one
            const deviceSerial = await ensureManualDevice();
            attendance = await tx.attendance.create({
              data: {
                employee_id: request.employee_id,
                date: dateContext,
                check_in: attendanceData.check_in ?? null,
                check_out: attendanceData.check_out ?? null,
                status:
                  (attendanceData.status as AttendanceStatus) ?? "present",
                notes: attendanceData.notes,
                deviceId: deviceSerial,
              },
            });
          }

          // Mark request as approved
          const approvedRequest = await tx.attendanceRequest.update({
            where: { id },
            data: {
              status: "approved",
              reviewed_by: reviewed_by ?? null,
              reviewed_at: new Date(),
              reviewer_notes: reviewer_notes ?? null,
            },
            include: fullRequestInclude,
          });

          return [approvedRequest, attendance];
        },
      );

      res.json({
        success: true,
        message: "Attendance request approved and attendance record updated",
        data: {
          request: updatedRequest,
          attendance: updatedAttendance,
        },
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /attendance/requests/:id/reject ────────────────────────────
  // HR/admin rejects — attendance record is NOT touched
  static async reject(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { reviewer_notes } = req.body;
      const reviewed_by = req.user?.userId;

      const request = await prisma.attendanceRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Attendance request not found",
        });
      }

      if (request.status !== "pending") {
        return res.status(409).json({
          success: false,
          message: `Request has already been ${request.status}`,
        });
      }

      const updated = await prisma.attendanceRequest.update({
        where: { id },
        data: {
          status: "rejected",
          reviewed_by: reviewed_by ?? null,
          reviewed_at: new Date(),
          reviewer_notes: reviewer_notes ?? null,
        },
        include: fullRequestInclude,
      });

      res.json({
        success: true,
        message: "Attendance request rejected",
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── DELETE /attendance/requests/:id ─────────────────────────────────
  // Employee can delete their own pending request; HR can delete any
  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const employee_id = req.user?.employeeId;
      const role = req.user?.role;

      const request = await prisma.attendanceRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          message: "Attendance request not found",
        });
      }

      if (role === "employee") {
        if (request.employee_id !== employee_id) {
          return res.status(403).json({
            success: false,
            message: "You are not allowed to delete this request",
          });
        }
        if (request.status !== "pending") {
          return res.status(409).json({
            success: false,
            message: "Only pending requests can be deleted",
          });
        }
      }

      await prisma.attendanceRequest.delete({ where: { id } });

      res.json({
        success: true,
        message: "Attendance request deleted",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
