import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";

let isSyncing = false;

const DEVICE_IP = "192.168.110.64";
const DEVICE_PORT = 4370;
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fetches ALL attendance logs from the ZK device with retry logic.
 * The device sometimes returns partial data on the first call —
 * retrying with a fresh socket is the most reliable fix.
 */
async function fetchLogsWithRetry(): Promise<any[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 300000, 4000, 0, "tcp");

    try {
      console.log(
        `[SYNC] Connecting to device (attempt ${attempt}/${MAX_RETRIES})...`,
      );
      await zk.createSocket();

      // Disable the device during read to prevent new punches
      // from corrupting the buffer mid-fetch (optional but recommended).
      try {
        await zk.disableDevice();
      } catch (_) {}

      const result = await zk.getAttendances();
      const logs: any[] = result?.data ?? [];

      console.log(`[SYNC] Fetched ${logs.length} raw log entries from device.`);

      if (logs.length === 0 && attempt < MAX_RETRIES) {
        throw new Error("Device returned 0 logs, may be a partial read.");
      }

      try {
        await zk.enableDevice();
      } catch (_) {}
      await zk.disconnect();

      return logs;
    } catch (err: any) {
      lastError = err;
      console.warn(`[SYNC] Attempt ${attempt} failed: ${err.message}`);

      // Always try to re-enable and disconnect cleanly
      try {
        await zk.enableDevice();
      } catch (_) {}
      try {
        await zk.disconnect();
      } catch (_) {}

      if (attempt < MAX_RETRIES) {
        console.log(`[SYNC] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw new Error(
    `All ${MAX_RETRIES} attempts failed. Last error: ${lastError?.message}`,
  );
}

// ── Main sync ─────────────────────────────────────────────────────────────────

export const runAttendanceSync = async () => {
  if (isSyncing) {
    console.log("[SYNC] Already in progress, skipping...");
    return;
  }

  const device = await prisma.device.findFirst({ where: { ip: DEVICE_IP } });
  if (!device) {
    console.error(`[SYNC] No device found for IP ${DEVICE_IP}.`);
    return;
  }

  try {
    isSyncing = true;

    // ── 1. Fetch all logs (with retry) ───────────────────────────────────────
    const rawLogs = await fetchLogsWithRetry();

    // Sort ascending — first punch first per employee-day
    const sortedLogs = [...rawLogs].sort(
      (a, b) =>
        (a.recordTime as Date).getTime() - (b.recordTime as Date).getTime(),
    );

    // ── 2. Pre-load ALL device mappings in one query ──────────────────────────
    // (avoids N+1 DB calls inside the loop, which caused timeouts on large sets)
    const allMappings = await prisma.deviceMapping.findMany();
    const mappingByBiometricId = new Map(
      allMappings.map((m) => [m.biometric_id, m]),
    );

    // ── 3. Group punches by employee + Nepal calendar date ───────────────────
    type DayKey = string;
    const groups = new Map<
      DayKey,
      {
        employeeId: string;
        biometricId: string;
        date: Date;
        punches: Date[];
      }
    >();

    let skippedUnmapped = 0;

    for (const log of sortedLogs) {
      const mapping = mappingByBiometricId.get(String(log.deviceUserId));
      if (!mapping) {
        skippedUnmapped++;
        continue;
      }

      const punchUTC = log.recordTime as Date;
      const nepalMs = punchUTC.getTime() + NEPAL_OFFSET_MS;
      const nepalDt = new Date(nepalMs);
      const punchDate = new Date(
        Date.UTC(
          nepalDt.getUTCFullYear(),
          nepalDt.getUTCMonth(),
          nepalDt.getUTCDate(),
        ),
      );

      const key: DayKey = `${mapping.employee_id}__${punchDate.toISOString()}`;
      if (!groups.has(key)) {
        groups.set(key, {
          employeeId: mapping.employee_id,
          biometricId: String(log.deviceUserId),
          date: punchDate,
          punches: [],
        });
      }
      groups.get(key)!.punches.push(punchUTC);
    }

    if (skippedUnmapped > 0) {
      console.warn(
        `[SYNC] Skipped ${skippedUnmapped} punches with no device mapping.`,
      );
    }

    console.log(`[SYNC] Processing ${groups.size} employee-day groups...`);

    // ── 4. Pre-load ALL existing attendance records in one query ─────────────
    const employeeIds = [
      ...new Set([...groups.values()].map((g) => g.employeeId)),
    ];
    const existingRecords = await prisma.attendance.findMany({
      where: { employee_id: { in: employeeIds } },
    });

    // Index by "employeeId__dateISO" for O(1) lookup
    const existingByKey = new Map(
      existingRecords.map((r) => [
        `${r.employee_id}__${r.date.toISOString()}`,
        r,
      ]),
    );

    // ── 5. Upsert one record per employee-day ────────────────────────────────
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const { employeeId, biometricId, date, punches } of groups.values()) {
      punches.sort((a, b) => a.getTime() - b.getTime());

      const checkIn = punches[0];
      const checkOut = punches.length > 1 ? punches[punches.length - 1] : null;

      const nepalCheckIn = new Date(checkIn.getTime() + NEPAL_OFFSET_MS);
      const h = nepalCheckIn.getUTCHours();
      const m = nepalCheckIn.getUTCMinutes();
      const isLate = h > 8 || (h === 8 && m > 0);

      console.log(
        `[SYNC] ${employeeId} | ${date.toISOString().slice(0, 10)}` +
          ` | in: ${checkIn.toISOString()} (${h}:${String(m).padStart(2, "0")} NPT)` +
          (checkOut ? ` | out: ${checkOut.toISOString()}` : " | no check-out"),
      );

      const key = `${employeeId}__${date.toISOString()}`;
      const existing = existingByKey.get(key);

      if (!existing) {
        await prisma.attendance.create({
          data: {
            employee_id: employeeId,
            date,
            check_in: checkIn,
            check_out: checkOut,
            status: isLate ? "late" : "present",
            biometric_id: biometricId,
            deviceId: device.serial_number,
          },
        });
        created++;
      } else {
        // Only update check_out if the new last punch is later than what's stored
        const betterCheckOut =
          checkOut &&
          (!existing.check_out ||
            checkOut.getTime() > existing.check_out.getTime())
            ? checkOut
            : undefined;

        if (betterCheckOut !== undefined) {
          await prisma.attendance.update({
            where: { employee_id_date: { employee_id: employeeId, date } },
            data: { check_out: betterCheckOut },
          });
          updated++;
        } else {
          skipped++;
        }
      }
    }

    console.log(
      `✅ Sync complete — created: ${created}, updated: ${updated}, unchanged: ${skipped}`,
    );
  } catch (err: any) {
    console.error("❌ Sync failed:", err.message);
  } finally {
    isSyncing = false;
  }
};
