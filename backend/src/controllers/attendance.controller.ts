import { Request, Response } from "express";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";

// ── Constants ────────────────────────────────────────────────────────────────

const MANUAL_DEVICE_SERIAL = "MANUAL";

// Nepal is UTC+5:45
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

// Late threshold in Nepal local time: 09:30
const LATE_THRESHOLD_NEPAL_HOUR = 9;
const LATE_THRESHOLD_NEPAL_MINUTE = 30;

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

const deviceInclude = {
  select: {
    serial_number: true,
    device_name: true,
    device_model: true,
    location: true,
    is_active: true,
  },
} as const;

const fullAttendanceInclude = {
  employee: { include: employeeInclude },
  device: deviceInclude,
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the Nepal-midnight anchor as a fake-UTC Date.
 *
 * "Fake-UTC" means the Date object's UTC fields hold Nepal local values.
 * This matches how the ZKTeco device stores punches: it sends Nepal local
 * time stamped with "Z", so Prisma stores it with those exact digits.
 *
 * e.g. Nepal local 2026-05-19 02:15 → returns 2026-05-19T00:00:00.000Z
 *
 * We derive today's Nepal calendar date by adding the offset to wall-clock
 * UTC, then construct a Date whose UTC fields equal that Nepal date at 00:00.
 */
function todayMidnight(): Date {
  const realUtcNow = new Date();
  const nepalNow = new Date(realUtcNow.getTime() + NEPAL_OFFSET_MS);
  // Build a fake-UTC Date: UTC fields = Nepal calendar date, time = 00:00
  return new Date(
    Date.UTC(
      nepalNow.getUTCFullYear(),
      nepalNow.getUTCMonth(),
      nepalNow.getUTCDate(),
    ),
  );
}

/**
 * Converts an "HH:MM" or "HH:MM:SS" Nepal local time string into a
 * fake-UTC Date for DB storage.
 *
 * Returns null if the input is empty, whitespace-only, or otherwise invalid.
 *
 * Storage convention (matching ZKTeco device behaviour):
 *   The UTC digits of the stored Date ARE the Nepal local time.
 *   i.e. stored = "YYYY-MM-DDThh:mm:ssZ" where hh:mm:ss is Nepal local.
 *
 * dateContext must be the fake-UTC midnight for the record's Nepal calendar
 * date (from todayMidnight() or the existing record's .date field).
 *
 * Example: hhmm = "09:30", dateContext = 2026-05-18T00:00:00.000Z
 *   → stored = 2026-05-18T09:30:00.000Z  (UTC digits = 09:30 NPT) ✅
 *   Frontend reads UTC digits directly → displays "09:30" ✅
 *
 * NOTE: We do NOT subtract NEPAL_OFFSET_MS here. The device never does,
 * and we must be consistent with how device punches are stored.
 */
function parseTimeString(
  hhmm: string | null | undefined,
  dateContext: Date,
): Date | null {
  // Guard: reject null, undefined, empty string, or whitespace-only
  if (!hhmm?.trim()) return null;

  const trimmed = hhmm.trim();
  const normalized = trimmed.length === 5 ? `${trimmed}:00` : trimmed;
  const [h, m, s] = normalized.split(":").map(Number);

  // Validate parsed numbers
  if (isNaN(h) || isNaN(m)) return null;

  // dateContext.getTime() is already the fake-UTC Nepal midnight in ms.
  // Add hours/minutes/seconds directly — no offset subtraction.
  return new Date(
    dateContext.getTime() + h * 3_600_000 + m * 60_000 + (s ?? 0) * 1_000,
  );
}

/**
 * Returns the current Nepal local time as a fake-UTC Date.
 * Used for self check-in / check-out timestamps so they are stored with
 * Nepal local digits, consistent with ZKTeco device punches.
 *
 * real UTC now → add NEPAL_OFFSET_MS → the Nepal local instant.
 * We then store that value as-is (its UTC fields = Nepal local time).
 *
 * Example: real UTC 03:45 NPT = 09:30 → stored as ...T09:30:00.000Z ✅
 */
function nowNepalFakeUtc(): Date {
  return new Date(Date.now() + NEPAL_OFFSET_MS);
}

/**
 * Late check: is the current Nepal local time past 09:30?
 */
function isLate(): boolean {
  const nepalNow = new Date(Date.now() + NEPAL_OFFSET_MS);
  const h = nepalNow.getUTCHours();
  const m = nepalNow.getUTCMinutes();
  return (
    h > LATE_THRESHOLD_NEPAL_HOUR ||
    (h === LATE_THRESHOLD_NEPAL_HOUR && m > LATE_THRESHOLD_NEPAL_MINUTE)
  );
}

/**
 * Ensures a sentinel "MANUAL" device exists for web/app self check-in
 * and HR manual entries (no physical biometric device).
 */
async function ensureManualDevice(): Promise<string> {
  const existing = await prisma.device.findUnique({
    where: { serial_number: MANUAL_DEVICE_SERIAL },
  });
  if (existing) return existing.serial_number;

  const created = await prisma.device.create({
    data: {
      serial_number: MANUAL_DEVICE_SERIAL,
      device_name: "Manual Entry",
      device_model: "N/A",
      ip: "0.0.0.0",
      is_active: false,
    },
  });
  return created.serial_number;
}

async function validateDevice(
  serial_number: string,
  res: Response<ApiResponse>,
) {
  const device = await prisma.device.findUnique({ where: { serial_number } });
  if (!device) {
    res.status(404).json({ success: false, message: "Device not found" });
    return null;
  }
  if (!device.is_active) {
    res.status(403).json({ success: false, message: "Device is inactive" });
    return null;
  }
  return device;
}

// ── Controller ───────────────────────────────────────────────────────────────

export class AttendanceController {
  // ── GET /attendance ──────────────────────────────────────────────────
  static async getAll(req: Request, res: Response<ApiResponse>) {
    try {
      const {
        employee_id,
        date,
        from_date,
        to_date,
        status,
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      const where: any = {};
      if (employee_id) where.employee_id = employee_id;
      if (status) where.status = status as AttendanceStatus;

      if (date) {
        where.date = new Date(date);
      } else if (from_date || to_date) {
        where.date = {};
        if (from_date) where.date.gte = new Date(from_date);
        if (to_date) where.date.lte = new Date(to_date);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const [records, total] = await Promise.all([
        prisma.attendance.findMany({
          where,
          skip,
          take,
          orderBy: { date: "desc" },
          include: fullAttendanceInclude,
        }),
        prisma.attendance.count({ where }),
      ]);

      res.json({
        success: true,
        message: "Attendance records retrieved",
        data: records,
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

  // ── GET /attendance/:id ──────────────────────────────────────────────
  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const record = await prisma.attendance.findUnique({
        where: { id },
        include: fullAttendanceInclude,
      });

      if (!record) {
        return res
          .status(404)
          .json({ success: false, message: "Attendance record not found" });
      }

      res.json({
        success: true,
        message: "Attendance record retrieved",
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /attendance/employee/:employee_id ────────────────────────────
  static async getByEmployee(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id } = req.params;
      const { month, year } = req.query as Record<string, string>;

      const employee = await prisma.employee.findUnique({
        where: { id: employee_id },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const where: any = { employee_id };
      if (month && year) {
        const y = parseInt(year);
        const m = parseInt(month) - 1;
        where.date = {
          gte: new Date(Date.UTC(y, m, 1)),
          lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
        };
      }

      const records = await prisma.attendance.findMany({
        where,
        orderBy: { date: "asc" },
        include: fullAttendanceInclude,
      });

      const summary = records.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      res.json({
        success: true,
        message: "Employee attendance retrieved",
        data: records,
        summary,
        total: records.length,
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /attendance/me ───────────────────────────────────────────────
  static async getMyAttendance(req: Request, res: Response<ApiResponse>) {
    try {
      const employee_id = req.user?.employeeId;
      if (!employee_id) {
        return res.status(403).json({
          success: false,
          message: "No employee profile linked to this account",
        });
      }

      const { month, year } = req.query as Record<string, string>;

      const where: any = { employee_id };
      if (month && year) {
        const y = parseInt(year);
        const m = parseInt(month) - 1;
        where.date = {
          gte: new Date(Date.UTC(y, m, 1)),
          lte: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
        };
      }

      const records = await prisma.attendance.findMany({
        where,
        orderBy: { date: "asc" },
        include: fullAttendanceInclude,
      });

      const summary = records.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      res.json({
        success: true,
        message: "Your attendance retrieved",
        data: records,
        summary,
        total: records.length,
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /attendance (HR/admin manual entry) ─────────────────────────
  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id, date, check_in, check_out, status, notes } =
        req.body;

      if (!employee_id || !date || !status) {
        return res.status(400).json({
          success: false,
          message: "employee_id, date, and status are required",
        });
      }

      const employee = await prisma.employee.findUnique({
        where: { id: employee_id },
      });
      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      const deviceSerial = await ensureManualDevice();
      // date from client is "YYYY-MM-DD" treated as fake-UTC Nepal midnight
      const dateContext = new Date(date);

      const record = await prisma.attendance.create({
        data: {
          employee_id,
          date: dateContext,
          check_in: parseTimeString(check_in, dateContext),
          check_out: parseTimeString(check_out, dateContext),
          status: status as AttendanceStatus,
          notes: notes ?? null,
          deviceId: deviceSerial,
        },
        include: fullAttendanceInclude,
      });

      res.status(201).json({
        success: true,
        message: "Attendance record created",
        data: record,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "Attendance record already exists for this employee on this date",
        });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /attendance/bulk ────────────────────────────────────────────
  static async bulkCreate(req: Request, res: Response<ApiResponse>) {
    try {
      const { records } = req.body as {
        records: {
          employee_id: string;
          date: string;
          check_in?: string;
          check_out?: string;
          status: AttendanceStatus;
          notes?: string;
        }[];
      };

      if (!Array.isArray(records) || records.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "records array is required" });
      }

      const uniqueEmployeeIds = [...new Set(records.map((r) => r.employee_id))];
      const employees = await prisma.employee.findMany({
        where: { id: { in: uniqueEmployeeIds } },
        select: { id: true },
      });
      const foundIds = new Set(employees.map((e) => e.id));
      const missing = uniqueEmployeeIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        return res.status(404).json({
          success: false,
          message: `Employees not found: ${missing.join(", ")}`,
        });
      }

      const deviceSerial = await ensureManualDevice();

      const created = await prisma.$transaction(
        records.map((r) => {
          const dateContext = new Date(r.date);
          return prisma.attendance.upsert({
            where: {
              employee_id_date: {
                employee_id: r.employee_id,
                date: dateContext,
              },
            },
            update: {
              check_in: parseTimeString(r.check_in, dateContext),
              check_out: parseTimeString(r.check_out, dateContext),
              status: r.status,
              notes: r.notes ?? null,
            },
            create: {
              employee_id: r.employee_id,
              date: dateContext,
              check_in: parseTimeString(r.check_in, dateContext),
              check_out: parseTimeString(r.check_out, dateContext),
              status: r.status,
              notes: r.notes ?? null,
              deviceId: deviceSerial,
            },
          });
        }),
      );

      res.status(201).json({
        success: true,
        message: `${created.length} attendance records processed`,
        data: created,
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /attendance/:id ────────────────────────────────────────────
  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const { check_in, check_out, status, notes } = req.body;

      const existing = await prisma.attendance.findUnique({ where: { id } });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Attendance record not found" });
      }

      // existing.date is the fake-UTC midnight for this record's Nepal calendar date.
      const dateContext = existing.date;

      /**
       * Resolve a check_in / check_out value from the PATCH body.
       *
       * The frontend sends one of:
       *   • "HH:MM"              — user-edited time in Nepal local (from the time picker)
       *   • null / undefined     — clear the field
       *
       * parseTimeString converts HH:MM → fake-UTC using the record's dateContext,
       * which is exactly what device punches do, so display is consistent.
       */
      function resolveTime(
        value: string | null | undefined,
      ): Date | null | undefined {
        if (value === undefined) return undefined; // field not sent → don't touch it
        if (!value?.trim()) return null; // null or empty string → clear it
        // Already a full ISO string? (shouldn't happen from the fixed frontend,
        // but handle gracefully to avoid double-conversion if old clients call this)
        if (value.includes("T")) {
          // Re-express as fake-UTC: extract HH:MM from the ISO string and re-parse.
          // The ISO string's UTC digits already equal Nepal local time (fake-UTC convention).
          const d = new Date(value);
          const hhmm = `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
          return parseTimeString(hhmm, dateContext);
        }
        // Plain "HH:MM" from the frontend edit dialog
        return parseTimeString(value, dateContext);
      }

      const checkInResolved = resolveTime(check_in);
      const checkOutResolved = resolveTime(check_out);

      const updated = await prisma.attendance.update({
        where: { id },
        data: {
          ...(checkInResolved !== undefined && { check_in: checkInResolved }),
          ...(checkOutResolved !== undefined && {
            check_out: checkOutResolved,
          }),
          ...(status !== undefined && { status: status as AttendanceStatus }),
          ...(notes !== undefined && { notes }),
        },
        include: fullAttendanceInclude,
      });

      res.json({
        success: true,
        message: "Attendance record updated",
        data: updated,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Attendance record not found" });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── DELETE /attendance/:id ───────────────────────────────────────────
  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const existing = await prisma.attendance.findUnique({ where: { id } });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Attendance record not found" });
      }

      await prisma.attendance.delete({ where: { id } });
      res.json({ success: true, message: "Attendance record deleted" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Attendance record not found" });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /attendance/summary ──────────────────────────────────────────
  static async getSummary(req: Request, res: Response<ApiResponse>) {
    try {
      const { from_date, to_date } = req.query as Record<string, string>;

      if (!from_date || !to_date) {
        return res.status(400).json({
          success: false,
          message: "from_date and to_date are required",
        });
      }

      const records = await prisma.attendance.findMany({
        where: { date: { gte: new Date(from_date), lte: new Date(to_date) } },
        include: { employee: { include: employeeInclude } },
      });

      const summaryMap = new Map();

      for (const r of records) {
        if (!summaryMap.has(r.employee_id)) {
          summaryMap.set(r.employee_id, {
            employee: r.employee,
            present: 0,
            absent: 0,
            late: 0,
            half_day: 0,
            on_leave: 0,
            total: 0,
          });
        }
        const entry = summaryMap.get(r.employee_id)!;
        entry[r.status] = (entry[r.status] || 0) + 1;
        entry.total += 1;
      }

      res.json({
        success: true,
        message: "Summary retrieved",
        data: Array.from(summaryMap.values()),
        period: { from_date, to_date },
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /attendance/check-in ────────────────────────────────────────
  static async checkIn(req: Request, res: Response<ApiResponse>) {
    try {
      const employee_id = req.user?.employeeId;
      if (!employee_id) {
        return res.status(403).json({
          success: false,
          message:
            "No employee profile linked to this account. Please contact HR.",
        });
      }

      const today = todayMidnight();

      const existing = await prisma.attendance.findUnique({
        where: { employee_id_date: { employee_id, date: today } },
      });
      if (existing?.check_in) {
        return res.status(409).json({
          success: false,
          message: "Already checked in today",
          data: existing,
        } as any);
      }

      const status = isLate() ? "late" : "present";
      // Store check-in as fake-UTC (Nepal local digits) — consistent with device punches
      const checkInTime = nowNepalFakeUtc();

      const { device_id } = req.body;
      let deviceSerial: string;
      let biometricId: string | null = null;

      if (device_id) {
        const device = await validateDevice(device_id, res);
        if (!device) return;

        const mapping = await prisma.deviceMapping.findFirst({
          where: { employee_id, device: { serial_number: device_id } },
        });
        if (!mapping) {
          return res.status(403).json({
            success: false,
            message: "Employee is not mapped to this device",
          });
        }

        deviceSerial = device_id;
        biometricId = mapping.biometric_id;
      } else {
        deviceSerial = await ensureManualDevice();
      }

      const record = await prisma.attendance.upsert({
        where: { employee_id_date: { employee_id, date: today } },
        update: {
          check_in: checkInTime,
          status,
          deviceId: deviceSerial,
          ...(biometricId && { biometric_id: biometricId }),
        },
        create: {
          employee_id,
          date: today,
          check_in: checkInTime,
          status,
          deviceId: deviceSerial,
          ...(biometricId && { biometric_id: biometricId }),
        },
        include: fullAttendanceInclude,
      });

      res.status(201).json({
        success: true,
        message: `Checked in successfully — status: ${status}`,
        data: record,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /attendance/sync ────────────────────────────────────────────
  static async sync(req: Request, res: Response<ApiResponse>) {
    try {
      const employee_id = req.user?.employeeId;
      const activeRole = req.user?.activeRole;

      // Employees can only sync their own attendance
      // Admins can sync all or a specific employee
      const targetEmployeeId =
        activeRole === "employee"
          ? employee_id
          : (req.body.employee_id ?? employee_id);

      if (!targetEmployeeId) {
        return res.status(400).json({
          success: false,
          message: "No employee target for sync",
        });
      }

      const employee = await prisma.employee.findUnique({
        where: { id: targetEmployeeId },
      });

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      // Pull attendance for current month
      const now = new Date();
      const startOfMonth = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );
      const endOfMonth = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          0,
          23,
          59,
          59,
          999,
        ),
      );

      const records = await prisma.attendance.findMany({
        where: {
          employee_id: targetEmployeeId,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
        orderBy: { date: "asc" },
        include: fullAttendanceInclude,
      });

      const summary = records.reduce(
        (acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      res.json({
        success: true,
        message: "Attendance synced successfully",
        data: records,
        summary,
        total: records.length,
        synced_at: new Date().toISOString(),
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /attendance/check-out ───────────────────────────────────────
  static async checkOut(req: Request, res: Response<ApiResponse>) {
    try {
      const employee_id = req.user?.employeeId;
      if (!employee_id) {
        return res.status(403).json({
          success: false,
          message:
            "No employee profile linked to this account. Please contact HR.",
        });
      }

      const today = todayMidnight();

      const existing = await prisma.attendance.findUnique({
        where: { employee_id_date: { employee_id, date: today } },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "No check-in found for today. Please check in first.",
        });
      }
      if (existing.check_out) {
        return res.status(409).json({
          success: false,
          message: "Already checked out today",
          data: existing,
        } as any);
      }

      // Store check-out as fake-UTC (Nepal local digits) — consistent with device punches
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { check_out: nowNepalFakeUtc() },
        include: fullAttendanceInclude,
      });

      res.json({
        success: true,
        message: "Checked out successfully",
        data: updated,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
