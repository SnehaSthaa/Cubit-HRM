import { Router, Request, Response } from "express";
import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const syncRouter = Router();

let isSyncing = false;

const DEVICE_IP = "192.168.110.64";
const DEVICE_PORT = 4370;
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const SHIFT_START_NEPAL_HOUR = 8;
const SHIFT_START_NEPAL_MINUTE = 0;

function nepalDateMidnightUTC(punchUTC: Date): Date {
  const nepalMs = punchUTC.getTime() + NEPAL_OFFSET_MS;
  const nepalDate = new Date(nepalMs);
  return new Date(
    Date.UTC(
      nepalDate.getUTCFullYear(),
      nepalDate.getUTCMonth(),
      nepalDate.getUTCDate(),
    ),
  );
}

function isLateArrival(punchUTC: Date): boolean {
  const nepalTime = new Date(punchUTC.getTime() + NEPAL_OFFSET_MS);
  const h = nepalTime.getUTCHours();
  const m = nepalTime.getUTCMinutes();
  return (
    h > SHIFT_START_NEPAL_HOUR ||
    (h === SHIFT_START_NEPAL_HOUR && m > SHIFT_START_NEPAL_MINUTE)
  );
}

function send(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

syncRouter.post(
  "/attendance/sync",
  authenticate,
  async (req: Request, res: Response) => {
    if (isSyncing) {
      return res
        .status(409)
        .json({ success: false, message: "Sync already in progress" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);
    isSyncing = true;

    try {
      send(res, "log", {
        type: "info",
        msg: "Connecting to biometric device…",
      });
      send(res, "progress", { pct: 5, label: "Connecting…" });

      await zk.createSocket();
      send(res, "log", {
        type: "info",
        msg: "Socket open",
        detail: `${DEVICE_IP}:${DEVICE_PORT}`,
      });
      send(res, "progress", { pct: 15, label: "Fetching attendance logs…" });

      const device = await prisma.device.findFirst({
        where: { ip: DEVICE_IP },
      });
      if (!device) {
        send(res, "log", {
          type: "err",
          msg: `No device found for IP ${DEVICE_IP}. Register it first.`,
        });
        send(res, "error", { message: "Device not registered" });
        return;
      }

      const logs = await zk.getAttendances();
      const total = logs.data.length;
      send(res, "log", { type: "info", msg: `Fetched ${total} punch records` });
      send(res, "stats", { total, saved: 0, skipped: 0 });

      // ✅ Sort chronologically
      const sortedLogs = [...logs.data].sort(
        (a, b) =>
          new Date(a.recordTime).getTime() - new Date(b.recordTime).getTime(),
      );

      let saved = 0;
      let skipped = 0;

      for (let i = 0; i < sortedLogs.length; i++) {
        const log = sortedLogs[i];

        const pct = Math.round(20 + ((i + 1) / total) * 70);
        send(res, "progress", {
          pct,
          label: `Processing ${i + 1} / ${total}…`,
        });

        const punchUTC = new Date(log.recordTime);
        const punchDate = nepalDateMidnightUTC(punchUTC); // ✅ correct date

        const mapping = await prisma.deviceMapping.findFirst({
          where: { biometric_id: String(log.deviceUserId) },
          include: { employee: { include: { personal_details: true } } },
        });

        if (!mapping) {
          skipped++;
          send(res, "log", {
            type: "warn",
            msg: `No mapping for biometric ID ${log.deviceUserId} — skipped`,
          });
          send(res, "punch", {
            name: `Biometric ID ${log.deviceUserId}`,
            time: log.recordTime,
            action: "—",
            status: "skip",
          });
          send(res, "stats", { total, saved, skipped });
          continue;
        }

        const empName = mapping.employee?.personal_details
          ? `${mapping.employee.personal_details.first_name} ${mapping.employee.personal_details.last_name}`
          : mapping.employee_id;

        const existing = await prisma.attendance.findUnique({
          where: {
            employee_id_date: {
              employee_id: mapping.employee_id,
              date: punchDate,
            },
          },
        });

        if (!existing) {
          await prisma.attendance.create({
            data: {
              employee_id: mapping.employee_id,
              date: punchDate,
              check_in: punchUTC,
              status: isLateArrival(punchUTC) ? "late" : "present",
              biometric_id: String(log.deviceUserId),
              deviceId: device.serial_number,
            },
          });
          saved++;
          send(res, "log", {
            type: "ok",
            msg: "Check-in saved",
            detail: `${empName} @ ${punchUTC.toISOString()}`,
          });
          send(res, "punch", {
            name: empName,
            time: punchUTC.toISOString(),
            action: "check_in",
            status: isLateArrival(punchUTC) ? "late" : "in",
          });
        } else if (!existing.check_out || punchUTC > existing.check_out) {
          await prisma.attendance.update({
            where: {
              employee_id_date: {
                employee_id: mapping.employee_id,
                date: punchDate,
              },
            },
            data: { check_out: punchUTC },
          });
          saved++;
          send(res, "log", {
            type: "ok",
            msg: "Check-out updated",
            detail: `${empName} @ ${punchUTC.toISOString()}`,
          });
          send(res, "punch", {
            name: empName,
            time: punchUTC.toISOString(),
            action: "check_out",
            status: "out",
          });
        } else {
          send(res, "log", {
            type: "info",
            msg: "Duplicate punch ignored",
            detail: empName,
          });
        }

        send(res, "stats", { total, saved, skipped });
      }

      send(res, "progress", { pct: 100, label: "Done" });
      send(res, "log", {
        type: "ok",
        msg: `Sync complete — saved: ${saved}, skipped: ${skipped}`,
      });
      send(res, "done", { saved, skipped, total });
    } catch (err: any) {
      send(res, "log", { type: "err", msg: `Sync failed: ${err.message}` });
      send(res, "error", { message: err.message });
    } finally {
      try {
        await zk.disconnect();
      } catch (_) {}
      isSyncing = false;
      res.end();
    }
  },
);
