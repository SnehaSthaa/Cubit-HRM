import { Router, Request, Response } from "express";
import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";
import { authenticate } from "../middleware/auth.js";

export const syncRouter = Router();

export let isSyncing = false;

const DEVICE_IP = "192.168.110.64";
const DEVICE_PORT = 4370;
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const SHIFT_START_NEPAL_HOUR = 8;
const SHIFT_START_NEPAL_MINUTE = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function nepalDateMidnightUTC(punchUTC: Date): Date {
  const nepalMs = punchUTC.getTime() + NEPAL_OFFSET_MS;
  const d = new Date(nepalMs);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function isLateArrival(punchUTC: Date): boolean {
  const d = new Date(punchUTC.getTime() + NEPAL_OFFSET_MS);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return (
    h > SHIFT_START_NEPAL_HOUR ||
    (h === SHIFT_START_NEPAL_HOUR && m > SHIFT_START_NEPAL_MINUTE)
  );
}

/** Writes a named SSE event. */
function send(res: Response, event: string, data: object) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  // Force flush — critical for Nginx / proxies that buffer SSE
  if (typeof (res as any).flush === "function") (res as any).flush();
}

/** Ends the SSE stream with an error event, then closes. */
function sendError(res: Response, message: string) {
  send(res, "log", { type: "err", msg: message });
  send(res, "error", { message });
  res.end();
}

/**
 * Opens a fresh ZK socket, fetches ALL logs, then disconnects.
 * Retries on partial/empty reads — the device often returns a
 * truncated buffer on the first attempt over TCP.
 */
async function fetchAllLogs(onProgress: (msg: string) => void): Promise<any[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 300000, 4000, 0, "tcp");

    try {
      onProgress(`Connecting to device (attempt ${attempt}/${MAX_RETRIES})…`);
      await zk.createSocket();

      // Freeze the device buffer so new punches don't corrupt the read
      try {
        await (zk as any).disableDevice();
      } catch (_) {}

      onProgress("Downloading attendance logs…");

      // Call WITHOUT a progress callback — most node-zklib builds
      // silently return nothing when given an unknown argument.
      const result = await zk.getAttendances();
      const logs: any[] = result?.data ?? [];

      try {
        await (zk as any).enableDevice();
      } catch (_) {}
      await zk.disconnect();

      if (logs.length === 0 && attempt < MAX_RETRIES) {
        throw new Error(
          "Device returned 0 logs — possible partial read, retrying…",
        );
      }

      onProgress(`Downloaded ${logs.length} punch records`);
      return logs;
    } catch (err: any) {
      lastError = err;
      onProgress(`Attempt ${attempt} failed: ${err.message}`);
      try {
        await (zk as any).enableDevice();
      } catch (_) {}
      try {
        await zk.disconnect();
      } catch (_) {}

      if (attempt < MAX_RETRIES) {
        onProgress(`Retrying in ${RETRY_DELAY_MS / 1000}s…`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `All ${MAX_RETRIES} attempts failed. Last: ${lastError?.message}`,
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────

syncRouter.post(
  "/attendance/sync",
  authenticate,
  async (req: Request, res: Response) => {
    if (isSyncing) {
      return res
        .status(409)
        .json({ success: false, message: "Sync already in progress" });
    }

    // Open SSE stream
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    isSyncing = true;

    try {
      // ── 1. Check device is registered ──────────────────────────────────────
      const device = await prisma.device.findFirst({
        where: { ip: DEVICE_IP },
      });
      if (!device) {
        // NOTE: use sendError (not return) — plain return leaves SSE open
        sendError(res, `No device registered for IP ${DEVICE_IP}`);
        return;
      }

      // ── 2. Fetch logs with retry ────────────────────────────────────────────
      send(res, "progress", { pct: 5, label: "Connecting to device…" });

      const rawLogs = await fetchAllLogs((msg) => {
        send(res, "log", { type: "info", msg });
      });

      send(res, "progress", {
        pct: 30,
        label: `Processing ${rawLogs.length} records…`,
      });
      send(res, "log", {
        type: "info",
        msg: `Fetched ${rawLogs.length} punch records from device`,
      });

      const sortedLogs = [...rawLogs].sort(
        (a, b) =>
          new Date(a.recordTime).getTime() - new Date(b.recordTime).getTime(),
      );

      // ── 3. Pre-load ALL mappings in one query (prevents N+1 timeouts) ───────
      const allMappings = await prisma.deviceMapping.findMany({
        include: { employee: { include: { personal_details: true } } },
      });
      const mappingByBiometricId = new Map(
        allMappings.map((m) => [m.biometric_id, m]),
      );

      // ── 4. Group punches by employee + Nepal date ───────────────────────────
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
      const total = sortedLogs.length;

      for (let i = 0; i < sortedLogs.length; i++) {
        const log = sortedLogs[i];
        const mapping = mappingByBiometricId.get(String(log.deviceUserId));

        if (!mapping) {
          skipped++;
          send(res, "log", {
            type: "warn",
            msg: `No mapping for biometric ID ${log.deviceUserId} — skipped`,
          });
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

        // Progress: 30–60% during grouping phase
        const pct = Math.round(30 + ((i + 1) / total) * 30);
        send(res, "progress", { pct, label: `Grouping ${i + 1} / ${total}…` });
      }

      // ── 5. Pre-load ALL existing attendance records in one query ─────────────
      const employeeIds = [
        ...new Set([...groups.values()].map((g) => g.employeeId)),
      ];
      const existingRecords = await prisma.attendance.findMany({
        where: { employee_id: { in: employeeIds } },
      });
      const existingByKey = new Map(
        existingRecords.map((r) => [
          `${r.employee_id}__${r.date.toISOString()}`,
          r,
        ]),
      );

      // ── 6. Upsert one record per employee-day ────────────────────────────────
      let saved = 0;
      const groupList = [...groups.values()];

      for (let i = 0; i < groupList.length; i++) {
        const { employeeId, biometricId, empName, date, punches } =
          groupList[i];
        punches.sort((a, b) => a.getTime() - b.getTime());

        const checkIn = punches[0];
        const checkOut =
          punches.length > 1 ? punches[punches.length - 1] : null;

        // Progress: 60–98% during save phase
        const pct = Math.round(60 + ((i + 1) / groupList.length) * 38);
        send(res, "progress", {
          pct,
          label: `Saving ${i + 1} / ${groupList.length}…`,
        });

        const existing = existingByKey.get(
          `${employeeId}__${date.toISOString()}`,
        );

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
          // Never overwrite check_in — only push check_out forward if newer
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

      // ── Done ─────────────────────────────────────────────────────────────────
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
      isSyncing = false;
      res.end();
    }
  },
);
