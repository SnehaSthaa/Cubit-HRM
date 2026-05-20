import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { JwtPayload } from "@/types/index.js";
import bcrypt from "bcryptjs";
import { allPermission } from "@/permissions/allowed-permission.js";

export class UserController {
  static async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const { userId } = req.user as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          is_active: true,

          employee: {
            include: {
              emergencyContacts: true,
              leaveBalances: {
                include: { leavePolicy: true },
              },
              documents: true,
              assets: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const permissions = allPermission[user.role] || [];

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            is_active: user.is_active,
            permissions,
          },
          employee: user.employee ?? null,
        },
      });
    } catch (error) {
      console.error("getMe Error:", error);

      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "unauthorized" });
      }
      const { userId } = req.user as JwtPayload;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "ALl fields are required",
        });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New passwords do not match",
        });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 8 characters",
        });
      }
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
        });
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not Found",
        });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: newPasswordHash },
      });

      return res
        .status(200)
        .json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("changePassword Error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
}
