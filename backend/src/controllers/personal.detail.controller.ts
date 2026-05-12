import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { ApiResponse } from "../types/index.js";
import { updatePersonalDetailSchema } from "../validator/personal.detail.validator.js";
import { ZodError } from "zod";

export class PersonalDetailController {
  static async get(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId } = req.params;
      const personal = await prisma.personalDetail.findUnique({
        where: { employee_id: employeeId },
      });

      if (!personal) {
        return res
          .status(404)
          .json({ success: false, message: "Personal details not found" });
      }

      res.json({
        success: true,
        message: "Personal details retrieved",
        data: personal,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async upsert(req: Request, res: Response<ApiResponse>) {
    try {
      const { employeeId } = req.params;

      // 1. Validate the body
      const validatedData = updatePersonalDetailSchema.parse(req.body);

      // 2. Destructure and Normalize
      const { date_of_birth, ...rest } = validatedData;
      const normalizedDate = date_of_birth
        ? new Date(date_of_birth)
        : undefined;

      // 3. Database Operation
      const [personal] = await prisma.$transaction([
        prisma.personalDetail.upsert({
          where: { employee_id: employeeId },
          update: {
            ...rest,
            ...(normalizedDate && { date_of_birth: normalizedDate }),
          },
          create: {
            // Provide explicit fallbacks for required Prisma fields
            employee_id: employeeId,
            first_name: rest.first_name || "",
            last_name: rest.last_name || "",
            email: rest.email || "",
            phone: rest.phone || "",
            // Spread the rest of the optional fields
            ...rest,
            ...(normalizedDate && { date_of_birth: normalizedDate }),
          },
        }),
        prisma.employee.update({
          where: { id: employeeId },
          data: { employee_verified: false },
        }),
      ]);

      res.json({
        success: true,
        message: "Personal details saved",
        data: personal,
      });
    } catch (error: any) {
      // Handle Zod Validation Errors
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: error.flatten().fieldErrors,
        });
      }

      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: `A record with this ${error.meta?.target} already exists.`,
        });
      }

      res.status(400).json({ success: false, message: error.message });
    }
  }
}
