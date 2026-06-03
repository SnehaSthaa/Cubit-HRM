import { Request, Response } from "express";
import {
  AttendanceStatus,
  AttendanceRequestType,
  AttendanceRequestStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";

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
 * Returns true if the given role array includes the target role string.
 */
const hasRole = (role: UserRole[] | undefined, target: UserRole): boolean =>
  role?.includes(target) ?? false;

/**
 * Parses a "YYYY-MM-DD" string into a UTC midnight Date so Prisma stores
 * it correctly in a @db.Date column without any timezone shift.
 * Returns null for empty / invalid input.
 */
function parseDateString(dateStr: string | null | undefined): Date | null {
  if (!dateStr?.trim()) return null;

  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));

  // Sanity check: make sure the date is valid
  if (isNaN(d.getTime())) return null;

  return d;
}

/**
 * Converts an "HH:MM" or "HH:MM:SS" time string into a Timestamptz Date
 * by combining it with the UTC-midnight dateContext.
 *
 * Since the schema stores check_in/check_out as @db.Timestamptz and the
 * rest of the system treats Nepal local time as fake-UTC, we simply add
 * the hour/minute/second offsets to the UTC-midnight base so the stored
 * timestamp reflects Nepal local clock time.
 *
 * Returns null for empty / invalid input.
 */
function parseTimeString(
  hhmm: string | null | undefined,
  dateContext: Date,
): Date | null {
  if (!hhmm?.trim()) return null;

  const trimmed = hhmm.trim();
  const normalized = trimmed.length === 5 ? `${trimmed}:00` : trimmed;
  const parts = normalized.split(":").map(Number);
  const [h, m, s] = parts;

  if (isNaN(h) || isNaN(m) || h > 23 || m > 59) return null;
  const sec = isNaN(s) ? 0 : s;
  if (sec > 59) return null;

  return new Date(
    dateContext.getTime() + h * 3_600_000 + m * 60_000 + sec * 1_000,
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

      // ── Validate date format ───────────────────────────────────────
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: "date must be in YYYY-MM-DD format",
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

      // ── Parse date safely using UTC to avoid timezone shifts ───────
      const dateContext = parseDateString(date);
      if (!dateContext) {
        return res.status(400).json({
          success: false,
          message: "Invalid date value provided",
        });
      }

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

      if (
        request_type === "check_in" &&
        requested_check_in?.trim() &&
        !checkInTime
      ) {
        return res.status(400).json({
          success: false,
          message: "requested_check_in must be in HH:MM or HH:MM:SS format",
        });
      }

      if (
        (request_type === "check_out" || request_type === "both") &&
        requested_check_out?.trim() &&
        !checkOutTime
      ) {
        return res.status(400).json({
          success: false,
          message: "requested_check_out must be in HH:MM or HH:MM:SS format",
        });
      }

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
          requested_check_in: checkInTime ?? null,
          requested_check_out: checkOutTime ?? null,
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
      console.error("[AttendanceRequest.create]", error);
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
      console.error("[AttendanceRequest.getMyRequests]", error);
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
        // Use parseDateString to avoid timezone shift on filter dates too
        if (from_date) {
          const parsed = parseDateString(from_date);
          if (parsed) where.date.gte = parsed;
        }
        if (to_date) {
          const parsed = parseDateString(to_date);
          if (parsed) where.date.lte = parsed;
        }
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
      console.error("[AttendanceRequest.getAll]", error);
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
        hasRole(role, UserRole.employee) &&
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
      console.error("[AttendanceRequest.getById]", error);
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

      // request.date is already a proper UTC-midnight Date from DB
      const dateContext = request.date;

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
            attendance = await tx.attendance.update({
              where: { id: existingAttendance.id },
              data: attendanceData,
            });
          } else {
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
      console.error("[AttendanceRequest.approve]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /attendance/requests/:id/reject ────────────────────────────
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
      console.error("[AttendanceRequest.reject]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── DELETE /attendance/requests/:id ──────────────────────────────────
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

      if (hasRole(role, UserRole.employee)) {
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
      console.error("[AttendanceRequest.delete]", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
