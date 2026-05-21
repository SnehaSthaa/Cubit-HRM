import { Request, Response } from "express";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";
import net from "net";

const ZK_DEFAULT_PORT = 4370;
const ZK_TIMEOUT_MS = 3000;
const MANUAL_DEVICE_SERIAL = "MANUAL";

function pingDevice(ip: string, port = ZK_DEFAULT_PORT): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(ZK_TIMEOUT_MS);
    socket
      .connect(port, ip, () => {
        socket.destroy();
        resolve(true);
      })
      .on("error", () => {
        socket.destroy();
        resolve(false);
      })
      .on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
  });
}

const mappingInclude = {
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
} as const;

export class DeviceController {
  // ── GET /devices ──────────────────────────────────────────────────────
  static async getAll(_req: Request, res: Response<ApiResponse>) {
    try {
      const devices = await prisma.device.findMany({
        include: { mappings: { include: mappingInclude } },
        orderBy: { created_at: "desc" },
      });

      const devicesWithStatus = await Promise.all(
        devices.map(async (device) => ({
          ...device,
          status: (await pingDevice(device.ip)) ? "online" : "offline",
        })),
      );

      res.json({
        success: true,
        message: "Devices retrieved",
        data: devicesWithStatus,
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /devices/:id ──────────────────────────────────────────────────
  static async getById(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const device = await prisma.device.findUnique({
        where: { id },
        include: { mappings: { include: mappingInclude } },
      });

      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      const online = await pingDevice(device.ip);
      res.json({
        success: true,
        message: "Device retrieved",
        data: { ...device, status: online ? "online" : "offline" },
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /devices ─────────────────────────────────────────────────────
  static async create(req: Request, res: Response<ApiResponse>) {
    try {
      const { serial_number, device_name, device_model, ip, location, port } =
        req.body;

      if (!serial_number || !device_name || !device_model || !ip) {
        return res.status(400).json({
          success: false,
          message:
            "serial_number, device_name, device_model, and ip are required",
        });
      }

      if (serial_number === MANUAL_DEVICE_SERIAL) {
        return res.status(400).json({
          success: false,
          message: `"${MANUAL_DEVICE_SERIAL}" is a reserved serial number`,
        });
      }

      const [existingIp, existingSerial] = await Promise.all([
        prisma.device.findUnique({ where: { ip } }),
        prisma.device.findUnique({ where: { serial_number } }),
      ]);

      if (existingIp) {
        return res.status(409).json({
          success: false,
          message: "A device with this IP already exists",
        });
      }
      if (existingSerial) {
        return res.status(409).json({
          success: false,
          message: "A device with this serial number already exists",
        });
      }

      const device = await prisma.device.create({
        data: {
          serial_number,
          device_name,
          device_model,
          ip,
          location: location ?? null,
          is_active: true,
        },
      });

      const online = await pingDevice(ip, port ?? ZK_DEFAULT_PORT);

      res.status(201).json({
        success: true,
        message: "Device added",
        data: { ...device, status: online ? "online" : "offline" },
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── PATCH /devices/:id ────────────────────────────────────────────────
  static async update(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;
      const {
        serial_number,
        device_name,
        device_model,
        ip,
        location,
        is_active,
      } = req.body;

      const existing = await prisma.device.findUnique({ where: { id } });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      if (serial_number === MANUAL_DEVICE_SERIAL) {
        return res.status(400).json({
          success: false,
          message: `"${MANUAL_DEVICE_SERIAL}" is a reserved serial number`,
        });
      }

      const [ipConflict, serialConflict] = await Promise.all([
        ip && ip !== existing.ip
          ? prisma.device.findUnique({ where: { ip } })
          : null,
        serial_number && serial_number !== existing.serial_number
          ? prisma.device.findUnique({ where: { serial_number } })
          : null,
      ]);

      if (ipConflict) {
        return res.status(409).json({
          success: false,
          message: "Another device already uses this IP",
        });
      }
      if (serialConflict) {
        return res.status(409).json({
          success: false,
          message: "Another device already uses this serial number",
        });
      }

      const device = await prisma.device.update({
        where: { id },
        data: {
          ...(serial_number && { serial_number }),
          ...(device_name && { device_name }),
          ...(device_model && { device_model }),
          ...(ip && { ip }),
          ...(location !== undefined && { location }),
          ...(is_active !== undefined && { is_active }),
        },
      });

      res.json({ success: true, message: "Device updated", data: device });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── DELETE /devices/:id ───────────────────────────────────────────────
  static async delete(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const existing = await prisma.device.findUnique({ where: { id } });
      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      if (existing.serial_number === MANUAL_DEVICE_SERIAL) {
        return res.status(400).json({
          success: false,
          message: "The manual-entry sentinel device cannot be deleted",
        });
      }

      await prisma.device.delete({ where: { id } });
      res.json({ success: true, message: "Device deleted" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /devices/:id/ping ─────────────────────────────────────────────
  static async ping(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const device = await prisma.device.findUnique({ where: { id } });
      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      const online = await pingDevice(device.ip);
      res.json({
        success: true,
        message: online ? "Device is online" : "Device is offline",
        data: {
          id: device.id,
          serial_number: device.serial_number,
          device_name: device.device_name,
          ip: device.ip,
          status: online ? "online" : "offline",
        },
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /devices/:id/sync ────────────────────────────────────────────
  static async sync(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const device = await prisma.device.findUnique({
        where: { id },
        include: { mappings: true },
      });
      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      const online = await pingDevice(device.ip);
      if (!online) {
        return res.status(503).json({
          success: false,
          message: `Device "${device.device_name}" is offline`,
        });
      }

      const mappings = await prisma.deviceMapping.findMany({
        where: { device_id: id },
        select: { employee_id: true, biometric_id: true },
      });

      if (mappings.length === 0) {
        return res.json({
          success: true,
          message: "No employee mappings found for this device",
          data: { synced: 0, skipped: 0, absent_marked: 0 },
        } as any);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = today.toISOString().split("T")[0];

      const employeeIds = mappings.map((m) => m.employee_id);

      const existingRecords = await prisma.attendance.findMany({
        where: { employee_id: { in: employeeIds }, date: today },
        select: { employee_id: true },
      });

      const attendedSet = new Set(existingRecords.map((r) => r.employee_id));
      const absentEmployeeIds = employeeIds.filter(
        (eid) => !attendedSet.has(eid),
      );

      let absent_marked = 0;

      if (absentEmployeeIds.length > 0) {
        const result = await prisma.attendance.createMany({
          data: absentEmployeeIds.map((employee_id) => ({
            employee_id,
            date: today,
            status: "absent" as AttendanceStatus,
            deviceId: device.serial_number,
          })),
          skipDuplicates: true,
        });
        absent_marked = result.count;
      }

      await prisma.device.update({
        where: { id },
        data: { updated_at: new Date() },
      });

      res.json({
        success: true,
        message: `Sync complete for "${device.device_name}"`,
        data: {
          device: device.device_name,
          date: todayString,
          mapped_employees: mappings.length,
          already_attended: attendedSet.size,
          absent_marked,
          note: "ZKTeco K40 uses ADMS push. Punches arrive via POST /adms/iclock/cdata and are written automatically. This sync back-fills absent records for employees who have not punched in yet today.",
        },
      } as any);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /devices/:id/mappings ─────────────────────────────────────────
  static async getMappings(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const device = await prisma.device.findUnique({ where: { id } });
      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      const mappings = await prisma.deviceMapping.findMany({
        where: { device_id: id },
        include: mappingInclude,
        orderBy: { created_at: "desc" },
      });

      res.json({
        success: true,
        message: "Mappings retrieved",
        data: mappings,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── GET /devices/mappings/all ─────────────────────────────────────────
  static async getAllMappings(_req: Request, res: Response<ApiResponse>) {
    try {
      const mappings = await prisma.deviceMapping.findMany({
        include: { ...mappingInclude, device: true },
        orderBy: { created_at: "desc" },
      });

      res.json({
        success: true,
        message: "All mappings retrieved",
        data: mappings,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── POST /devices/mappings ────────────────────────────────────────────
  static async addMapping(req: Request, res: Response<ApiResponse>) {
    try {
      const { employee_id, device_id, biometric_id } = req.body;

      if (!employee_id || !device_id || !biometric_id) {
        return res.status(400).json({
          success: false,
          message: "employee_id, device_id, and biometric_id are required",
        });
      }

      const [employee, device] = await Promise.all([
        prisma.employee.findUnique({ where: { id: employee_id } }),
        prisma.device.findUnique({ where: { id: device_id } }),
      ]);

      if (!employee) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }
      if (!device) {
        return res
          .status(404)
          .json({ success: false, message: "Device not found" });
      }

      const mapping = await prisma.deviceMapping.create({
        data: { employee_id, device_id, biometric_id },
        include: { ...mappingInclude, device: true },
      });

      res.status(201).json({
        success: true,
        message: "Mapping created",
        data: mapping,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message:
            "This employee or biometric ID is already mapped to this device",
        });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ── DELETE /devices/mappings/:id ──────────────────────────────────────
  static async removeMapping(req: Request, res: Response<ApiResponse>) {
    try {
      const { id } = req.params;

      const existing = await prisma.deviceMapping.findUnique({
        where: { id },
      });

      if (!existing) {
        return res
          .status(404)
          .json({ success: false, message: "Mapping not found" });
      }

      // Atomically delete all attendance records + the mapping
      const [deleted] = await prisma.$transaction([
        prisma.attendance.deleteMany({
          where: { employee_id: existing.employee_id },
        }),
        prisma.deviceMapping.delete({
          where: { id },
        }),
      ]);

      console.log(
        `[removeMapping] employee_id: ${existing.employee_id} | attendance deleted: ${deleted.count}`,
      );

      res.json({
        success: true,
        message: "Mapping and all attendance records removed",
        data: { attendance_records_deleted: deleted.count },
      });
    } catch (error: any) {
      console.error("[removeMapping] Error:", error);
      if (error.code === "P2025") {
        return res
          .status(404)
          .json({ success: false, message: "Mapping not found" });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
