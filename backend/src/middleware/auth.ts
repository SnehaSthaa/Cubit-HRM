import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtPayload, UserRole } from "../types/index.js";
import { allPermission } from "@/permissions/allowed-permission.js";
import { AllowedType } from "@/permissions/permission.js";

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

    if (!roles.includes(req.user.role)) {
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
    const userRole = user.role;
    const permissionsForUserRole = allPermission[userRole];
    //database fetch
    //user role

    //flattern the permission to the arrary
    //only extrat string value

    const flatternPermissions = Object.entries(permissionsForUserRole).flatMap(
      ([module, actions]) =>
        Object.entries(actions)
          .filter(([_, value]) => {
            return !!value;
          })
          .map(([key]) => key),
    );

    const hasPermission = permissions.some((perm) =>
      flatternPermissions.includes(perm),
    );
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "Forbidden-missing permission",
      });
    }
    next();
  };
};
