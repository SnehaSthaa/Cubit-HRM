import cron from "node-cron";
import { runAttendanceSync } from "./syncTask.js";

export const setupCronJobs = () => {
  // Schedule to run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[CRON] Triggering scheduled sync...");
    await runAttendanceSync();
  });

  console.log("🕒 Cron Scheduler initialized (15m interval).");
};
