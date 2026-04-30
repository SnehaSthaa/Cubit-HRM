import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import routes from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";
import { AppError } from "./utils/appError";
import { ensureBucket } from "./utils/minio";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDist = path.join(__dirname, "..", "frontend", "dist");

const corsOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:5173,http://localhost:5174"
)
  .split(",")
  .map((o) => o.trim());

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

app.use(routes);

app.use((req, res, next) => {
  next(new AppError("Route not found", 404));
});
app.use(errorHandler);

const BUCKETS = ["employee-documents", "employee-files"];

const start = async () => {
  try {
    await Promise.all(BUCKETS.map(ensureBucket));
    console.log("MinIO buckets ready");
  } catch (err: any) {
    console.error(" MinIO init failed:", err.message);
    console.warn(" Server starting without MinIO — file uploads will fail");
  }

  const server = app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received: closing server");
    server.close(() => process.exit(0));
  });
};

start();

export default app;
