import { Request, Response } from "express";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";

// ── Constants ────────────────────────────────────────────────────────────────

const MANUAL_DEVICE_SERIAL = "MANUAL";

// Late threshold: 09:30 local time
const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 30;

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

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseTimeString(t: string): Date {
  return new Date(`1970-01-01T${t}`);
}

/**
 * FIX: Consistent local-time based check using local hours/minutes directly,
 * instead of mixing local getHours() with Date.UTC() which was confusing.
 * Returns a 1970-epoch Date representing the current local time (for DB storage).
 */
function currentTimeAs1970(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds()),
  );
}

/**
 * FIX: Late check now uses local time directly instead of comparing
 * against a UTC-anchored threshold with local hours stuffed into UTC.
 */
function isLate(): boolean {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  return (
    h > LATE_THRESHOLD_HOUR ||
    (h === LATE_THRESHOLD_HOUR && m > LATE_THRESHOLD_MINUTE)
  );
}

/**
 * Ensures a sentinel "MANUAL" device exists for HR/admin manual entries
 * AND for web/app based self check-in (no physical biometric device).
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
  const device = await prisma.device.findUnique({
    where: { serial_number },
  });
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
        where.date = {
          gte: new Date(parseInt(year), parseInt(month) - 1, 1),
          lte: new Date(parseInt(year), parseInt(month), 0),
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
        where.date = {
          gte: new Date(parseInt(year), parseInt(month) - 1, 1),
          lte: new Date(parseInt(year), parseInt(month), 0),
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

      const record = await prisma.attendance.create({
        data: {
          employee_id,
          date: new Date(date),
          check_in: check_in ? parseTimeString(check_in) : null,
          check_out: check_out ? parseTimeString(check_out) : null,
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
        records.map((r) =>
          prisma.attendance.upsert({
            where: {
              employee_id_date: {
                employee_id: r.employee_id,
                date: new Date(r.date),
              },
            },
            update: {
              check_in: r.check_in ? parseTimeString(r.check_in) : null,
              check_out: r.check_out ? parseTimeString(r.check_out) : null,
              status: r.status,
              notes: r.notes ?? null,
            },
            create: {
              employee_id: r.employee_id,
              date: new Date(r.date),
              check_in: r.check_in ? parseTimeString(r.check_in) : null,
              check_out: r.check_out ? parseTimeString(r.check_out) : null,
              status: r.status,
              notes: r.notes ?? null,
              deviceId: deviceSerial,
            },
          }),
        ),
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

      const updated = await prisma.attendance.update({
        where: { id },
        data: {
          ...(check_in !== undefined && {
            check_in: check_in ? parseTimeString(check_in) : null,
          }),
          ...(check_out !== undefined && {
            check_out: check_out ? parseTimeString(check_out) : null,
          }),
          ...(status && { status: status as AttendanceStatus }),
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
        where: {
          date: { gte: new Date(from_date), lte: new Date(to_date) },
        },
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

      // FIX: Use isLate() which compares local hours directly,
      // instead of the old approach that mixed local hours with Date.UTC()
      const status: AttendanceStatus = isLate() ? "late" : "present";
      const checkInTime = currentTimeAs1970();

      const { device_id } = req.body;
      let deviceSerial: string;
      let biometricId: string | null = null;

      if (device_id) {
        // ── Biometric device check-in ──
        const device = await validateDevice(device_id, res);
        if (!device) return;

        const mapping = await prisma.deviceMapping.findFirst({
          where: {
            employee_id,
            device: { serial_number: device_id },
          },
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
        // ── Web / app check-in (no physical device) ──
        deviceSerial = await ensureManualDevice();
      }

      const record = await prisma.attendance.upsert({
        where: { employee_id_date: { employee_id, date: today } },
        update: {
          check_in: checkInTime,
          status,
          deviceId: deviceSerial,
          // FIX: was "biomeric_id" (missing 't') — now correctly "biometric_id"
          ...(biometricId && { biometric_id: biometricId }),
        },
        create: {
          employee_id,
          date: today,
          check_in: checkInTime,
          status,
          deviceId: deviceSerial,
          // FIX: was "biomeric_id" (missing 't') — now correctly "biometric_id"
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

      // FIX: Use the same currentTimeAs1970() helper used everywhere else,
      // instead of the inconsistent `new Date(\`1970-01-01T${toTimeString()}\`)` pattern
      const checkOutTime = currentTimeAs1970();

      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { check_out: checkOutTime },
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
