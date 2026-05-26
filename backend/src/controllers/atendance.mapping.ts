import { Request, Response } from "express";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";

// ─── Reusable include ────────────────────────────────────────────────────────

const attendanceInclude = {
  employee: {
    include: {
      personal_details: {
        select: {
          first_name: true,
          last_name: true,
          email: true,
          phone: true,
        },
      },
    },
  },
  device: {
    select: {
      serial_number: true,
      device_name: true,
      device_model: true,
      location: true,
      is_active: true,
    },
  },
} as const;

// ─── GET /attendances ────────────────────────────────────────────────────────

export const getAttendances = async (req: Request, res: Response) => {
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

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

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

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
        include: attendanceInclude,
      }),
      prisma.attendance.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: records,
      meta: {
        total,
        page: parseInt(page),
        limit: take,
        total_pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── GET /attendances/:id ────────────────────────────────────────────────────

export const getAttendanceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.attendance.findUnique({
      where: { id },
      include: attendanceInclude,
    });

    if (!record) {
      return res
        .status(404)
        .json({ success: false, message: "Attendance record not found" });
    }

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── GET /attendances/employee/:employee_id ──────────────────────────────────

export const getAttendanceByEmployee = async (req: Request, res: Response) => {
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
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      where.date = { gte: start, lte: end };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: "asc" },
      include: attendanceInclude,
    });

    const summary = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return res.status(200).json({
      success: true,
      data: records,
      summary,
      total: records.length,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── POST /attendances ───────────────────────────────────────────────────────

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const {
      employee_id,
      date,
      check_in,
      check_out,
      status,
      notes,
      device_id, // serial_number of the device
      biometric_id,
    } = req.body;

    if (!employee_id || !date || !status || !device_id) {
      return res.status(400).json({
        success: false,
        message: "employee_id, date, status, and device_id are required",
      });
    }

    // Validate employee
    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
    });
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Validate device by serial_number (schema FK references serial_number)
    const device = await prisma.device.findUnique({
      where: { serial_number: device_id },
    });
    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });
    }
    if (!device.is_active) {
      return res
        .status(403)
        .json({ success: false, message: "Device is inactive" });
    }

    const record = await prisma.attendance.create({
      data: {
        employee_id,
        date: new Date(date),
        check_in: check_in ? new Date(`1970-01-01T${check_in}`) : null,
        check_out: check_out ? new Date(`1970-01-01T${check_out}`) : null,
        status: status as AttendanceStatus,
        notes,
        deviceId: device_id,
        biometric_id: biometric_id ?? null, // note: typo kept as-is from schema
      },
      include: attendanceInclude,
    });

    return res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Attendance record already exists for this employee on this date",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── POST /attendances/bulk ──────────────────────────────────────────────────

export const bulkCreateAttendance = async (req: Request, res: Response) => {
  try {
    const { records } = req.body as {
      records: {
        employee_id: string;
        date: string;
        check_in?: string;
        check_out?: string;
        status: AttendanceStatus;
        notes?: string;
        device_id: string; // serial_number
        biometric_id?: string;
      }[];
    };

    if (!Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "records array is required" });
    }

    // Pre-validate all device serial_numbers in one query
    const uniqueDeviceIds = [...new Set(records.map((r) => r.device_id))];
    const devices = await prisma.device.findMany({
      where: { serial_number: { in: uniqueDeviceIds } },
      select: { serial_number: true, is_active: true },
    });

    const deviceMap = new Map(devices.map((d) => [d.serial_number, d]));

    const missingDevices = uniqueDeviceIds.filter((id) => !deviceMap.has(id));
    if (missingDevices.length > 0) {
      return res.status(404).json({
        success: false,
        message: `Devices not found: ${missingDevices.join(", ")}`,
      });
    }

    const inactiveDevices = uniqueDeviceIds.filter(
      (id) => !deviceMap.get(id)?.is_active,
    );
    if (inactiveDevices.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Inactive devices: ${inactiveDevices.join(", ")}`,
      });
    }

    // Pre-validate all employee_ids in one query
    const uniqueEmployeeIds = [...new Set(records.map((r) => r.employee_id))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: uniqueEmployeeIds } },
      select: { id: true },
    });
    const foundEmployeeIds = new Set(employees.map((e) => e.id));
    const missingEmployees = uniqueEmployeeIds.filter(
      (id) => !foundEmployeeIds.has(id),
    );
    if (missingEmployees.length > 0) {
      return res.status(404).json({
        success: false,
        message: `Employees not found: ${missingEmployees.join(", ")}`,
      });
    }

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
            check_in: r.check_in ? new Date(`1970-01-01T${r.check_in}`) : null,
            check_out: r.check_out
              ? new Date(`1970-01-01T${r.check_out}`)
              : null,
            status: r.status,
            notes: r.notes,
            deviceId: r.device_id,
            biometric_id: r.biometric_id ?? null,
          },
          create: {
            employee_id: r.employee_id,
            date: new Date(r.date),
            check_in: r.check_in ? new Date(`1970-01-01T${r.check_in}`) : null,
            check_out: r.check_out
              ? new Date(`1970-01-01T${r.check_out}`)
              : null,
            status: r.status,
            notes: r.notes,
            deviceId: r.device_id,
            biometric_id: r.biometric_id ?? null,
          },
        }),
      ),
    );

    return res.status(201).json({
      success: true,
      message: `${created.length} attendance records processed`,
      data: created,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── PATCH /attendances/:id ──────────────────────────────────────────────────

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status, notes, device_id, biometric_id } =
      req.body;

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Attendance record not found" });
    }

    // Validate new device if provided
    if (device_id) {
      const device = await prisma.device.findUnique({
        where: { serial_number: device_id },
      });
      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }
      if (!device.is_active) {
        return res
          .status(403)
          .json({ success: false, message: "Device is inactive" });
      }
    }

    const updated = await prisma.attendance.update({
      where: { id },
      data: {
        ...(check_in !== undefined && {
          check_in: check_in ? new Date(`1970-01-01T${check_in}`) : null,
        }),
        ...(check_out !== undefined && {
          check_out: check_out ? new Date(`1970-01-01T${check_out}`) : null,
        }),
        ...(status && { status: status as AttendanceStatus }),
        ...(notes !== undefined && { notes }),
        ...(device_id && { deviceId: device_id }),
        ...(biometric_id !== undefined && { biometric_id: biometric_id }),
      },
      include: attendanceInclude,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── DELETE /attendances/:id ─────────────────────────────────────────────────

export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.attendance.findUnique({ where: { id } });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Attendance record not found" });
    }

    await prisma.attendance.delete({ where: { id } });

    return res
      .status(200)
      .json({ success: true, message: "Attendance record deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── GET /attendances/summary ────────────────────────────────────────────────

export const getAttendanceSummary = async (req: Request, res: Response) => {
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
      include: {
        employee: {
          include: {
            personal_details: {
              select: { first_name: true, last_name: true, email: true },
            },
          },
        },
      },
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
      entry[r.status as keyof typeof entry] =
        (entry[r.status as keyof typeof entry] as number) + 1;
      entry.total += 1;
    }

    return res.status(200).json({
      success: true,
      data: Array.from(summaryMap.values()),
      period: { from_date, to_date },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── POST /attendances/check-in ──────────────────────────────────────────────

export const checkIn = async (req: Request, res: Response) => {
  try {
    const employee_id = (req as any).user?.employee_id;
    const { device_id, biometric_id } = req.body;

    if (!device_id) {
      return res
        .status(400)
        .json({ success: false, message: "device_id is required" });
    }

    // Validate device
    const device = await prisma.device.findUnique({
      where: { serial_number: device_id },
    });
    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });
    }
    if (!device.is_active) {
      return res
        .status(403)
        .json({ success: false, message: "Device is inactive" });
    }

    // Validate device mapping for this employee
    const mapping = await prisma.deviceMapping.findFirst({
      where: { employee_id, device: { serial_number: device_id } },
    });
    if (!mapping) {
      return res.status(403).json({
        success: false,
        message: "Employee is not mapped to this device",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: { employee_id_date: { employee_id, date: today } },
    });

    if (existing?.check_in) {
      return res
        .status(409)
        .json({ success: false, message: "Already checked in today" });
    }

    const now = new Date();
    const checkInTime = new Date(
      Date.UTC(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds()),
    );

    const lateThreshold = new Date("1970-01-01T09:30:00.000Z");
    const status: AttendanceStatus =
      checkInTime > lateThreshold ? "late" : "present";

    const record = await prisma.attendance.upsert({
      where: { employee_id_date: { employee_id, date: today } },
      update: {
        check_in: checkInTime,
        status,
        deviceId: device_id,
        biometric_id: biometric_id ?? mapping.biometric_id,
      },
      create: {
        employee_id,
        date: today,
        check_in: checkInTime,
        status,
        deviceId: device_id,
        biometric_id: biometric_id ?? mapping.biometric_id,
      },
      include: attendanceInclude,
    });

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

// ─── POST /attendances/check-out ─────────────────────────────────────────────

export const checkOut = async (req: Request, res: Response) => {
  try {
    const employee_id = (req as any).user?.employee_id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: { employee_id_date: { employee_id, date: today } },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "No check-in found for today" });
    }
    if (existing.check_out) {
      return res
        .status(409)
        .json({ success: false, message: "Already checked out today" });
    }

    const now = new Date();
    const checkOutTime = new Date(
      `1970-01-01T${now.toTimeString().slice(0, 8)}`,
    );

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: { check_out: checkOutTime },
      include: attendanceInclude,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};
