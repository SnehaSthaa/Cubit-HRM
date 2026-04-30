import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
console.log("Connecting with:", connectionString);

let prismaInstance: PrismaClient;

try {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool, { schema: "public" });
  prismaInstance = new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });
  console.log(" Prisma client created successfully");
} catch (err) {
  console.error(" Prisma client FAILED to initialize:", err);
  process.exit(1); // crash loudly so we can see the error
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaInstance!;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
