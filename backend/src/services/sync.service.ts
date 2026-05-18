// src/routes/attendance.sync.ts
import { Router, Request, Response } from "express";
import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";

export const syncRouter = Router();

let isSyncing = false;

const DEVICE_IP = "192.168.110.64";
const DEVICE_PORT = 4370;

function send(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

syncRouter.post("/attendance/sync", async (req: Request, res: Response) => {
  if (isSyncing) {
    return res
      .status(409)
      .json({ success: false, message: "Sync already in progress" });
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);
  isSyncing = true;

  try {
    send(res, "log", { type: "info", msg: "Connecting to biometric device…" });

    await zk.createSocket();
    send(res, "log", {
      type: "info",
      msg: "Socket open",
      detail: `${DEVICE_IP}:${DEVICE_PORT}`,
    });
    send(res, "progress", { pct: 15, label: "Fetching attendance logs…" });

    const logs = await zk.getAttendances();
    const total = logs.data.length;
    send(res, "log", { type: "info", msg: `Fetched ${total} punch records` });
    send(res, "stats", { total, saved: 0, skipped: 0 });

    let saved = 0;
    let skipped = 0;

    for (let i = 0; i < logs.data.length; i++) {
      const log = logs.data[i];
      const punchTime = new Date(log.recordTime);
      const punchDate = new Date(punchTime.toISOString().split("T")[0]);

      const pct = Math.round(20 + ((i + 1) / total) * 70);
      send(res, "progress", { pct, label: `Processing ${i + 1} / ${total}…` });

      const mapping = await prisma.deviceMapping.findFirst({
        where: { biometric_id: String(log.deviceUserId) },
        include: {
          employee: {
            include: { personal_details: true },
          },
        },
      });

      if (!mapping) {
        skipped++;
        send(res, "log", {
          type: "warn",
          msg: `No mapping for ID ${log.deviceUserId} — skipped`,
        });
        send(res, "punch", {
          name: `Biometric ID ${log.deviceUserId}`,
          time: punchTime.toISOString(),
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
        const h = punchTime.getHours();
        const m = punchTime.getMinutes();
        const isLate = h > 9 || (h === 9 && m > 30);

        await prisma.attendance.create({
          data: {
            employee_id: mapping.employee_id,
            date: punchDate,
            check_in: punchTime,
            status: isLate ? "late" : "present",
            biometric_id: String(log.deviceUserId),
            deviceId: "ZK-K40-MAIN",
          },
        });
        saved++;
        send(res, "log", {
          type: "ok",
          msg: `Check-in saved`,
          detail: `${empName} @ ${punchTime.toLocaleTimeString()}`,
        });
        send(res, "punch", {
          name: empName,
          time: punchTime.toISOString(),
          action: "check_in",
          status: isLate ? "late" : "in",
        });
      } else if (!existing.check_out || punchTime > existing.check_out) {
        await prisma.attendance.update({
          where: {
            employee_id_date: {
              employee_id: mapping.employee_id,
              date: punchDate,
            },
          },
          data: { check_out: punchTime, updated_at: new Date() },
        });
        saved++;
        send(res, "log", {
          type: "ok",
          msg: `Check-out updated`,
          detail: `${empName} @ ${punchTime.toLocaleTimeString()}`,
        });
        send(res, "punch", {
          name: empName,
          time: punchTime.toISOString(),
          action: "check_out",
          status: "out",
        });
      } else {
        send(res, "log", {
          type: "info",
          msg: `Duplicate punch ignored`,
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
});
