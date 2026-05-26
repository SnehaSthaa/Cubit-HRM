import { Router } from "express";
import { UserController } from "@/controllers/user.controller";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth";
import { RolesandAccessAction } from "@/permissions/permission";

const router = Router();
router.get(
  "/me",
  authenticate,

  UserController.getMe,
);
router.patch(
  "/me/change-password",
  authenticate,
  UserController.changePassword,
);
router.post("/switch-role", authenticate, UserController.switchRole);
router.post(
  "/assign-role",
  authenticate,
  authorize("super_admin"),
  hasRequiredPermission([RolesandAccessAction.Create]),
  UserController.assignRole,
);
router.delete(
  "/remove-role",
  authenticate,
  authorize("super_admin"),
  hasRequiredPermission([RolesandAccessAction.Delete]),
  UserController.removeRole,
);

export default router;
