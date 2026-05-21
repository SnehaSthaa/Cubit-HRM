import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";

let isSyncing = false;

const DEVICE_IP = "192.168.110.64";
const DEVICE_PORT = 4370;
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

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

  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 200000, 4000, 0, "tcp");

  try {
    isSyncing = true;
    await zk.createSocket();

    const logs = await zk.getAttendances();

    // Sort ascending — ensures first punch processed first per employee-day
    const sortedLogs = [...logs.data].sort(
      (a, b) =>
        (a.recordTime as Date).getTime() - (b.recordTime as Date).getTime(),
    );

    // ── Group punches by employee + Nepal calendar date ──────────────────────
    // Do this BEFORE hitting the DB so each employee-day is resolved once,
    // not punch-by-punch (avoids the re-run overwrite bug).
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

    for (const log of sortedLogs) {
      const mapping = await prisma.deviceMapping.findFirst({
        where: { biometric_id: String(log.deviceUserId) },
      });
      if (!mapping) continue;

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

    // ── Upsert one record per employee-day ───────────────────────────────────
    for (const { employeeId, biometricId, date, punches } of groups.values()) {
      // Already sorted, but sort within group to be safe
      punches.sort((a, b) => a.getTime() - b.getTime());

      const checkIn = punches[0];
      const checkOut = punches.length > 1 ? punches[punches.length - 1] : null;

      const nepalCheckIn = new Date(checkIn.getTime() + NEPAL_OFFSET_MS);
      const h = nepalCheckIn.getUTCHours();
      const m = nepalCheckIn.getUTCMinutes();
      const isLate = h > 8 || (h === 8 && m > 0);

      console.log(
        `[SYNC] ${employeeId} | date: ${date.toISOString().slice(0, 10)}` +
          ` | in: ${checkIn.toISOString()} (${h}:${String(m).padStart(2, "0")} NPT)` +
          (checkOut ? ` | out: ${checkOut.toISOString()}` : " | no check-out"),
      );

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
            status: isLate ? "late" : "present",
            biometric_id: biometricId,
            deviceId: device.serial_number,
          },
        });
      } else {
        // On re-runs: only update check_out if the new last punch is later.
        // Never overwrite check_in — it was correct from the first sync run.
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
        }
      }
    }

    console.log("✅ Sync complete.");
  } catch (err: any) {
    console.error("❌ Sync failed:", err.message);
  } finally {
    try {
      await zk.disconnect();
    } catch (_) {}
    isSyncing = false;
  }
};
