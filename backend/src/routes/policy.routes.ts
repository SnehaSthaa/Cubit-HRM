import express from "express";
import { LeavePolicyController } from "../controllers/policy.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth.js";
import { LeaveManagementAction } from "@/permissions/permission.js";

const router = express.Router();
router.use(authenticate);

router.get(
  "/",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeavePolicyController.getAll,
);
router.post(
  "/",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([LeaveManagementAction.Create]),
  LeavePolicyController.create,
);
router.put(
  "/:id",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([LeaveManagementAction.Edit]),
  LeavePolicyController.update,
);
router.delete(
  "/:id",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([LeaveManagementAction.Delete]),
  LeavePolicyController.remove,
);

export default router;
