import { Router, Request, Response } from "express";
import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const syncRouter = Router();

// ── Shared across scheduler + HTTP so they don't conflict ────────────────────
export let isSyncing = false;

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

    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 200000, 4000, 0, "tcp");
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

      send(res, "progress", { pct: 15, label: "Fetching attendance logs…" });

      // ── Fetch with progress ──────────────────────────────────────────────────
      const logs = await zk.getAttendances(
        (received: number, total: number) => {
          const pct = total > 0 ? Math.round(15 + (received / total) * 15) : 15;
          send(res, "progress", {
            pct,
            label: `Downloading… ${received}/${total}`,
          });
        },
      );

      if (logs.err) throw new Error(`Device error: ${logs.err}`);

      const total = logs.data.length;
      send(res, "log", { type: "info", msg: `Fetched ${total} punch records` });
      send(res, "stats", { total, saved: 0, skipped: 0 });

      // ── Sort chronologically ─────────────────────────────────────────────────
      const sortedLogs = [...logs.data].sort(
        (a, b) =>
          new Date(a.recordTime).getTime() - new Date(b.recordTime).getTime(),
      );

      // ── GROUP by employee+date FIRST (fixes the re-run overwrite bug) ────────
      type DayKey = string;
      const groups = new Map<
        DayKey,
        {
          employeeId: string;
          biometricId: string;
          empName: string;
          date: Date;
          punches: Date[];
        }
      >();

      let skipped = 0;

      for (let i = 0; i < sortedLogs.length; i++) {
        const log = sortedLogs[i];
        const pct = Math.round(30 + ((i + 1) / total) * 30);
        send(res, "progress", { pct, label: `Grouping ${i + 1} / ${total}…` });

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
          send(res, "stats", { total, saved: 0, skipped });
          continue;
        }

        const punchUTC = new Date(log.recordTime);
        const punchDate = nepalDateMidnightUTC(punchUTC);
        const key: DayKey = `${mapping.employee_id}__${punchDate.toISOString()}`;
        const empName = mapping.employee?.personal_details
          ? `${mapping.employee.personal_details.first_name} ${mapping.employee.personal_details.last_name}`
          : mapping.employee_id;

        if (!groups.has(key)) {
          groups.set(key, {
            employeeId: mapping.employee_id,
            biometricId: String(log.deviceUserId),
            empName,
            date: punchDate,
            punches: [],
          });
        }
        groups.get(key)!.punches.push(punchUTC);
      }

      // ── Upsert one record per employee-day ───────────────────────────────────
      let saved = 0;
      const groupList = [...groups.values()];

      for (let i = 0; i < groupList.length; i++) {
        const { employeeId, biometricId, empName, date, punches } =
          groupList[i];
        punches.sort((a, b) => a.getTime() - b.getTime());

        const checkIn = punches[0];
        const checkOut =
          punches.length > 1 ? punches[punches.length - 1] : null;
        const pct = Math.round(60 + ((i + 1) / groupList.length) * 38);
        send(res, "progress", {
          pct,
          label: `Saving ${i + 1} / ${groupList.length}…`,
        });

        const existing = await prisma.attendance.findUnique({
          where: { employee_id_date: { employee_id: employeeId, date } },
        });

        if (!existing) {
          await prisma.attendance.create({
            data: {
              employee_id: employeeId,
              date,
              check_in: checkIn,
              check_out: checkOut,
              status: isLateArrival(checkIn) ? "late" : "present",
              biometric_id: biometricId,
              deviceId: device.serial_number,
            },
          });
          saved++;
          send(res, "log", {
            type: "ok",
            msg: "Attendance saved",
            detail: `${empName} in: ${checkIn.toISOString()}${checkOut ? ` out: ${checkOut.toISOString()}` : ""}`,
          });
          send(res, "punch", {
            name: empName,
            time: checkIn.toISOString(),
            action: "check_in",
            status: isLateArrival(checkIn) ? "late" : "in",
          });
        } else {
          // Never overwrite check_in — only update check_out if newer
          const betterCheckOut =
            checkOut &&
            (!existing.check_out ||
              checkOut.getTime() > existing.check_out.getTime())
              ? checkOut
              : null;
          if (betterCheckOut) {
            await prisma.attendance.update({
              where: { employee_id_date: { employee_id: employeeId, date } },
              data: { check_out: betterCheckOut },
            });
            saved++;
            send(res, "log", {
              type: "ok",
              msg: "Check-out updated",
              detail: `${empName} @ ${betterCheckOut.toISOString()}`,
            });
            send(res, "punch", {
              name: empName,
              time: betterCheckOut.toISOString(),
              action: "check_out",
              status: "out",
            });
          } else {
            send(res, "log", {
              type: "info",
              msg: "Already up to date",
              detail: empName,
            });
          }
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
