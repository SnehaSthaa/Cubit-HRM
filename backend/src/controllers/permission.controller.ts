// controllers/permission.controller.ts
import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { ApiResponse } from "../types/index.js";
import { UserRole } from "@prisma/client";
import { tr } from "zod/locales";

export class PermissionController {
  static async getPermissionByRole(req: Request, res: Response<ApiResponse>) {
    try {
      const { role } = req.params;

      const permission = await prisma.permission.findUnique({
        where: { role: role as UserRole },
      });

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: `No permissions found for role: ${role}`,
        });
      }

      res.json({
        success: true,
        message: "Permissions retrieved",
        data: permission.permissions,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
  static async updatePermissionByRole(
    req: Request,
    res: Response<ApiResponse>,
  ) {
    try {
      const { role } = req.params;
      const { permissions } = req.body;
      if (!permissions) {
        return res.status(400).json({
          success: false,
          message: "Permissions are required",
        });
      }
      const updated = await prisma.permission.update({
        where: { role: role as UserRole },
        data: { permissions },
      });
      res.json({
        success: true,
        message: "Permissions updated",
        data: updated,
      });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({
          success: false,
          message: `Role ${req.params.role} not found`,
        });
      }
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
