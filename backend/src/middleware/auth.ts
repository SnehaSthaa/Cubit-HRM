import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload, UserRole } from "../types/index.js";
import { allPermission } from "@/permissions/allowed-permission.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const secret = (process.env.JWT_SECRET ||
      "your-super-secret-jwt-key-change-this") as string;
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Not authenticated" });
    }

    const activeRole = req.user.activeRole;

    console.log("activeRole: ", activeRole);
    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    console.log("userRoles: ", userRoles);

    const rolesToCheck = activeRole ? [activeRole, ...userRoles] : userRoles;

    const hasRole = rolesToCheck.some((r) => roles.includes(r as UserRole));
    console.log("hasRole: ", hasRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
        debug: { activeRole, userRoles, required: roles },
      });
    }

    next();
  };
};

export const hasRequiredPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const activeRole = user.activeRole
      ? user.activeRole
      : Array.isArray(user.role)
        ? user.role[0]
        : user.role;

    const resolvedRole = (
      Array.isArray(activeRole) ? activeRole[0] : activeRole
    ) as string;

    console.log("[PERM CHECK]", {
      resolvedRole,
      required: permissions,
      userPayload: { activeRole: user.activeRole, role: user.role },
    });

    const permsForRole =
      allPermission[resolvedRole as keyof typeof allPermission];

    if (!permsForRole) {
      return res.status(403).json({
        success: false,
        message: `Forbidden - no permissions config for role: ${resolvedRole}`,
      });
    }

    const allowedPermissions = Object.values(permsForRole).flatMap((actions) =>
      Object.entries(actions as Record<string, boolean>)
        .filter(([, hasPerm]) => hasPerm === true)
        .map(([action]) => action),
    );

    const hasPermission = permissions.some((perm) =>
      allowedPermissions.includes(perm),
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - missing permission",
        debug: {
          resolvedRole,
          required: permissions,
          allowed: allowedPermissions,
        },
      });
    }

    next();
  };
};
