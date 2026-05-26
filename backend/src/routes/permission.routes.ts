import { PermissionController } from "@/controllers/permission.controller";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth";
import { RolesandAccessAction } from "@/permissions/permission";
import { Router } from "express";

const router = Router();
router.use(authenticate);
router.get(
  "/:role",
  hasRequiredPermission([RolesandAccessAction.View]),
  PermissionController.getPermissionByRole,
);

router.put(
  "/:role",
  authorize("super_admin"),
  hasRequiredPermission([RolesandAccessAction.Edit]),
  PermissionController.updatePermissionByRole,
);
export default router;
