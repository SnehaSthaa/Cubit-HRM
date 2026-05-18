import ZKLib from "node-zklib";
import { prisma } from "../db/prisma.js";

let isSyncing = false;

const DEVICE_IP = "192.168.110.64";
const DEVICE_PORT = 4370;

function toNepalTime(date: Date): Date {
  const nepalOffsetMs = (5 * 60 + 45) * 60 * 1000;
  return new Date(date.getTime() + nepalOffsetMs);
}

export const runAttendanceSync = async () => {
  if (isSyncing) {
    console.log("[SYNC] Already in progress, skipping...");
    return;
  }

  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);

  try {
    isSyncing = true;
    console.log("--- Connecting to Biometric Device ---");
    await zk.createSocket();

    const device = await prisma.device.findFirst({
      where: { ip: DEVICE_IP },
    });

    if (!device) {
      console.error(
        `[SYNC] No device found in DB for IP ${DEVICE_IP}. ` +
          `Register it first via the Device Config panel, then retry.`,
      );
      return;
    }

    console.log(`[SYNC] Using device: ${device.device_name} (${device.id})`);

    const logs = await zk.getAttendances();
    console.log(`[DEVICE] Found ${logs.data.length} total logs.`);

    for (const log of logs.data) {
      const rawTime = new Date(log.recordTime);
      const punchTime = toNepalTime(rawTime);

      // Extract date components from the NPT-shifted time using UTC accessors
      const year = punchTime.getUTCFullYear();
      const month = String(punchTime.getUTCMonth() + 1).padStart(2, "0");
      const day = String(punchTime.getUTCDate()).padStart(2, "0");
      const punchDate = new Date(`${year}-${month}-${day}`);

      const mapping = await prisma.deviceMapping.findFirst({
        where: { biometric_id: String(log.deviceUserId) },
      });

      if (!mapping) continue;

      await prisma.attendance.upsert({
        where: {
          employee_id_date: {
            employee_id: mapping.employee_id,
            date: punchDate,
          },
        },
        update: {
          check_out: punchTime,
        },
        create: {
          employee_id: mapping.employee_id,
          date: punchDate,
          check_in: punchTime,
          status: "present",
          biometric_id: String(log.deviceUserId),
          deviceId: device.serial_number,
        },
      });
    }

    console.log("✅ Sync completed successfully.");
  } catch (err: any) {
    console.error("❌ Sync failed:", err.message);
  } finally {
    try {
      await zk.disconnect();
    } catch (e) {}
    isSyncing = false;
  }
};
