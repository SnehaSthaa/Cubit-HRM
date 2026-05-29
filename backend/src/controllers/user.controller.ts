import { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { JwtPayload } from "@/types/index.js";
import bcrypt from "bcryptjs";
import { allPermission } from "@/permissions/allowed-permission.js";

const ROLE_LIMITS: Record<string, number> = {
  super_admin: 1,
  hr_admin: 5,
};

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
              personal_details: true,
              bank_details: true,
              // FIX: sort departments latest-first so frontend's
              // getLatestDepartment() (which also sorts desc) always
              // agrees with what the backend considers "current".
              department: { orderBy: { joining_date: "desc" } },
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

      const activeRole = (req.user as JwtPayload).activeRole ?? user.role[0];
      const permissions =
        allPermission[activeRole as keyof typeof allPermission] ?? {};

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            activeRole,
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
          .json({ success: false, message: "Unauthorized" });
      }
      const { userId } = req.user as JwtPayload;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }
      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "New passwords do not match",
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

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
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
  static async switchRole(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }
      const { role: requestedRole } = req.body;
      if (!requestedRole) {
        return res
          .status(400)
          .json({ success: false, message: "Requested role is required" });
      }
      const { userId } = req.user as JwtPayload;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, email: true },
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      if (!user.role.includes(requestedRole)) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this role",
        });
      }
      const { AuthService } = await import("../services/auth.service.js");
      const token = AuthService.generateToken(user, requestedRole);
      return res.json({
        success: true,
        message: `Switched to role ${requestedRole}`,
        data: { token, activeRole: requestedRole },
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
  static async assignRole(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { userId, role } = req.body;

      if (!userId || !role) {
        return res.status(400).json({
          success: false,
          message: "userId and role are required",
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      if (user.role.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "User already has this role",
        });
      }
      if (ROLE_LIMITS[role]) {
        const count = await prisma.user.count({
          where: { role: { has: role } },
        });
        if (count >= ROLE_LIMITS[role]) {
          return res.status(400).json({
            success: false,
            message: `Cannot assign role ${role}. Limit of ${ROLE_LIMITS[role]} reached.`,
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: { push: role } },
        select: { id: true, role: true },
      });

      return res.status(200).json({
        success: true,
        message: "Role assigned successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("assignRole Error:", error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
  static async removeRole(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }
      const { userId, role } = req.body;
      if (!userId || !role) {
        return res.status(400).json({
          success: false,
          message: "userId and role are required",
        });
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      if (!user.role.includes(role)) {
        return res.status(400).json({
          success: false,
          message: "User does not have this role",
        });
      }
      if (user.role.length <= 1) {
        return res.status(400).json({
          success: false,
          message: "User must have at least one role",
        });
      }
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: { set: user.role.filter((r) => r !== role) } },
        select: { id: true, role: true },
      });
      return res.status(200).json({
        success: true,
        message: "Role removed successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("removeRole Error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
}
