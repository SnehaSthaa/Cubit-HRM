import { Router, Request, Response } from "express";
import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";

export const syncRouter = Router();

export let isSyncing = false;

const DEVICE_IP = "192.168.110.64";
const DEVICE_PORT = 4370;
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const SHIFT_START_NEPAL_HOUR = 8;
const SHIFT_START_NEPAL_MINUTE = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

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

async function fetchAllLogs(onProgress: (msg: string) => void): Promise<any[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 300000, 4000, 0, "tcp");

    try {
      onProgress(`Connecting to device (attempt ${attempt}/${MAX_RETRIES})…`);
      await zk.createSocket();
      try {
        await (zk as any).disableDevice();
      } catch (_) {}

      onProgress("Downloading attendance logs…");

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

syncRouter.get("/attendance/sync", async (req: Request, res: Response) => {
  const isBypass = req.query.bypass === "true";

  if (!isBypass) {
    console.log("[SYNC] Running with bypass flag or open access.");
  }

  if (isSyncing) {
    return res
      .status(409)
      .json({ success: false, message: "Sync already in progress" });
  }

  isSyncing = true;

  try {
    console.log("[SYNC START] Starting biometric data sync processing...");

    const device = await prisma.device.findFirst({
      where: { ip: DEVICE_IP },
    });
    if (!device) {
      console.error(`[SYNC ERROR] No device registered for IP ${DEVICE_IP}`);
      return res.status(404).json({
        success: false,
        message: `No device registered for IP ${DEVICE_IP}`,
      });
    }

    const rawLogs = await fetchAllLogs((msg) => console.log(`[ZKLib] ${msg}`));

    const sortedLogs = [...rawLogs].sort(
      (a, b) =>
        new Date(b.recordTime).getTime() - new Date(a.recordTime).getTime(),
    );

    const allMappings = await prisma.deviceMapping.findMany({
      include: { employee: { include: { personal_details: true } } },
    });
    const mappingByBiometricId = new Map(
      allMappings.map((m) => [m.biometric_id, m]),
    );

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

    for (const log of sortedLogs) {
      const mapping = mappingByBiometricId.get(String(log.deviceUserId));
      if (!mapping) {
        skipped++;
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

    let saved = 0;
    let upToDateCount = 0;
    const groupList = [...groups.values()];

    for (let i = 0; i < groupList.length; i++) {
      const { employeeId, biometricId, empName, date, punches } = groupList[i];

      punches.sort((a, b) => a.getTime() - b.getTime());
      const checkIn = punches[0];
      const checkOut = punches.length > 1 ? punches[punches.length - 1] : null;

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
        console.log(`[SAVE] New attendance record written for ${empName}`);
      } else {
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
          console.log(`[UPDATE] Check-out extended forward for ${empName}`);
        } else {
          upToDateCount++;
          if (upToDateCount > 50) {
            console.log(
              "[SYNC INFO] Caught up to legacy entries. Stopping database sync scan early.",
            );
            break;
          }
        }
      }
    }

    console.log(
      `[SYNC DONE] Processing complete. Total records: ${rawLogs.length}, Saved/Updated: ${saved}, Skipped Mappings: ${skipped}`,
    );

    return res.status(200).json({
      success: true,
      message: "Biometric machine sync complete!",
      data: {
        totalLogsOnDevice: rawLogs.length,
        recordsSavedOrUpdated: saved,
        unmappedLogsSkipped: skipped,
      },
    });
  } catch (err: any) {
    console.error("[SYNC FATAL ERROR]", err);
    return res.status(500).json({
      success: false,
      message: `Sync routine failed: ${err.message}`,
    });
  } finally {
    isSyncing = false;
  }
});
