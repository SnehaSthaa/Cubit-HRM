import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./src/db/prisma/schema.prisma",

  migrations: {
    path: "./src/db/prisma/migrations",
    seed: "bun ./src/db/prisma/seed.ts",
  },

  datasource: {
    url: process.env.DATABASE_URL,
  },
});