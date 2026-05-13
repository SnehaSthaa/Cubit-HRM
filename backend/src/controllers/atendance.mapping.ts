import { Request, Response } from "express";
import { PrismaClient, AttendanceStatus } from "@prisma/client";

const prisma = new PrismaClient();

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
        include: {
          employee: {
            include: {
              personal_details: {
                select: { first_name: true, last_name: true, email: true },
              },
            },
          },
        },
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

export const getAttendanceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const record = await prisma.attendance.findUnique({
      where: { id },
      include: {
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
      },
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
      const end = new Date(parseInt(year), parseInt(month), 0); // last day of month
      where.date = { gte: start, lte: end };
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: "asc" },
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

export const createAttendance = async (req: Request, res: Response) => {
  try {
    const { employee_id, date, check_in, check_out, status, notes } = req.body;

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

    const record = await prisma.attendance.create({
      data: {
        employee_id,
        date: new Date(date),
        check_in: check_in ? new Date(`1970-01-01T${check_in}`) : null,
        check_out: check_out ? new Date(`1970-01-01T${check_out}`) : null,
        status: status as AttendanceStatus,
        notes,
      },
      include: {
        employee: {
          include: {
            personal_details: { select: { first_name: true, last_name: true } },
          },
        },
      },
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
      }[];
    };

    if (!Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "records array is required" });
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

export const updateAttendance = async (req: Request, res: Response) => {
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
          check_in: check_in ? new Date(`1970-01-01T${check_in}`) : null,
        }),
        ...(check_out !== undefined && {
          check_out: check_out ? new Date(`1970-01-01T${check_out}`) : null,
        }),
        ...(status && { status: status as AttendanceStatus }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        employee: {
          include: {
            personal_details: { select: { first_name: true, last_name: true } },
          },
        },
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

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

export const getAttendanceSummary = async (req: Request, res: Response) => {
  try {
    const { from_date, to_date } = req.query as Record<string, string>;

    if (!from_date || !to_date) {
      return res
        .status(400)
        .json({
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
            personal_details: { select: { first_name: true, last_name: true } },
          },
        },
      },
    });

    const summaryMap = new Map<
      string,
      {
        employee: any;
        present: number;
        absent: number;
        late: number;
        half_day: number;
        on_leave: number;
        total: number;
      }
    >();

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

export const checkIn = async (req: Request, res: Response) => {
  try {
    const employee_id = (req as any).user?.employee_id; // from auth middleware
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
      `1970-01-01T${now.toTimeString().slice(0, 8)}`,
    );

    const lateThreshold = new Date("1970-01-01T09:30:00");
    const status: AttendanceStatus =
      checkInTime > lateThreshold ? "late" : "present";

    const record = await prisma.attendance.upsert({
      where: { employee_id_date: { employee_id, date: today } },
      update: { check_in: checkInTime, status },
      create: { employee_id, date: today, check_in: checkInTime, status },
    });

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

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
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};
