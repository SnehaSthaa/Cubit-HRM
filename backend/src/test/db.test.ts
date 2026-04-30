import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "../db/prisma.js";

describe("Database Connection", () => {
  beforeEach(async () => {
    // Setup - ensure clean state for each test
  });

  afterEach(async () => {
    // Cleanup after each test if needed
  });

  it("should connect to database", async () => {
    try {
      // Test basic connectivity with a simple query
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    } catch (error) {
      console.error("Database connection test failed:", error);
      expect(error).toBeUndefined();
    }
  });

  it("should be able to query users table", async () => {
    try {
      const users = await prisma.user.findMany({
        take: 1, // Just get one record to test
      });
      expect(Array.isArray(users)).toBe(true);
    } catch (error) {
      console.error("Users table query test failed:", error);
      expect(error).toBeUndefined();
    }
  });

  it("should be able to query employees table", async () => {
    try {
      const employees = await prisma.employee.findMany({
        take: 1, // Just get one record to test
      });
      expect(Array.isArray(employees)).toBe(true);
    } catch (error) {
      console.error("Employees table query test failed:", error);
      expect(error).toBeUndefined();
    }
  });

  it("should handle database errors gracefully", async () => {
    try {
      // Try to find a non-existent record
      const result = await prisma.user.findUnique({
        where: { id: "non-existent-uuid" },
      });
      expect(result).toBeNull();
    } catch (error) {
      // This should not throw an error, just return null
      expect(error).toBeUndefined();
    }
  });
});
