import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { syncRouter } from "./services/sync.service";

import { setupCronJobs } from "./CRON/index.js";
import { runAttendanceSync } from "./CRON/syncTask.js";

import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./utils/appError.js";
import { ensureBucket } from "./utils/minio.js";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, "..", "frontend", "dist");

// 2. CORS Configuration
const corsOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((o) => o.trim());

// 3. Global Middleware
app.use(helmet());
app.use(
  cors({
    origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0] || "*",
  }),
);
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(frontendDist));
app.use("/api", syncRouter);

// 4. Routes
app.use(routes);

// 5. 404 & Global Error Handling
app.use((req, res, next) => {
  next(new AppError("Route not found", 404));
});
app.use(errorHandler);

const BUCKETS = ["employee-documents", "employee-files"];

/**
 * Main Startup Function
 */
const start = async () => {
  try {
    // A. Ensure MinIO is ready
    await Promise.all(BUCKETS.map(ensureBucket));
    console.log("✅ MinIO buckets ready");

    // B. Initialize the Cron Scheduler (Runs every 15m/30m)
    setupCronJobs();

    // C. RUN INITIAL SYNC IMMEDIATELY
    // This allows you to see data in the DB right after 'npm run dev'
    console.log("Starting initial biometric device sync...");
    await runAttendanceSync();
  } catch (err: any) {
    console.error(" Initialization failed:", err.message);
    console.warn(" Server starting with limited functionality");
  }

  // D. Start the Express Server
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  // E. Graceful Shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM received: closing server");
    server.close(() => process.exit(0));
  });
};

start();

export default app;
