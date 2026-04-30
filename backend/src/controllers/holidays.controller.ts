import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { HolidayType } from "@prisma/client";

export class HolidayController {
  // GET ALL
  static async getall(req: Request, res: Response) {
    try {
      const holidays = await prisma.holiday.findMany({
        orderBy: [{ start_date: "asc" }, { created_at: "asc" }],
      });

      return res.status(200).json({
        success: true,
        data: holidays,
      });
    } catch (error: any) {
      console.log("GET ERROR FULL:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // CREATE (supports BOTH formats: date OR start/end)
  static async create(req: Request, res: Response) {
    try {
      const { name, start_date, end_date, holiday_type } = req.body;

      console.log("Parsed values:", {
        name,
        start_date,
        end_date,
        holiday_type,
      });

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      console.log("Dates:", {
        startDate,
        endDate,
        valid: !isNaN(startDate.getTime()),
      });

      const holiday = await prisma.holiday.create({
        data: {
          name,
          start_date: startDate,
          end_date: endDate,
          holiday_type: holiday_type ?? "public",
        },
      });

      console.log("Created:", holiday);

      return res.status(201).json({ success: true, data: holiday });
    } catch (error: any) {
      console.error("message:", error.message);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // DELETE
  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.holiday.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: "Holiday deleted successfully",
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Holiday not found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to delete holiday",
      });
    }
  }

  // UPDATE (safe partial update)
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, start_date, end_date, holiday_type } = req.body;

      const holiday = await prisma.holiday.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(start_date && { start_date: new Date(start_date) }),
          ...(end_date && { end_date: new Date(end_date) }),
          ...(holiday_type && { holiday_type: holiday_type as HolidayType }),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Holiday updated successfully",
        data: holiday,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: "Holiday not found",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update holiday",
      });
    }
  }
}
