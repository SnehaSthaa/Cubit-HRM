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

    const userRoles = Array.isArray(req.user.role)
      ? req.user.role
      : [req.user.role];
    const hasRole = userRoles.some((r) => roles.includes(r as UserRole));

    if (!hasRole) {
      return res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
    }

    next();
  };
};

export const hasRequiredPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const activeRole = user.activeRole;
    const permsForRole =
      allPermission[activeRole as keyof typeof allPermission];
    if (!permsForRole) {
      return res
        .status(403)
        .json({ message: "Forbidden - no permissions found for role" });
    }
    const flattenedPermissions = Object.values(permsForRole).flatMap(
      (actions) =>
        Object.entries(actions as Record<string, boolean>)
          .filter(([_, hasPerm]) => hasPerm)
          .map(([action]) => action),
    );

    const hasPermission = permissions.some((perm) =>
      flattenedPermissions.includes(perm),
    );

    if (!hasPermission) {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden-missing permission" });
    }

    next();
  };
};
