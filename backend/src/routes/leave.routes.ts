import { Router } from "express";
import { LeaveController } from "../controllers/leave.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { LeaveManagementAction } from "@/permissions/permission.js";
import { validate } from "@/middleware/validate.js";
import {
  createLeaveSchema,
  updateLeaveSchema,
} from "@/validators/leave.validator.js";

const router = Router();
router.use(authenticate);

// ─── Collection routes ────────────────────────────────────────────────────────
router.get(
  "/",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getAll,
);

router.post(
  "/",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.Create]),
  validate(createLeaveSchema),
  LeaveController.create,
);

// ─── /balance routes — most specific FIRST, param route LAST ─────────────────
// IMPORTANT: /balance/customize must come before /balance/:employee_id,
// otherwise Express treats the string "customize" as the :employee_id value
// and this route is never reached.

router.patch(
  "/balance/customize",
  authorize("super_admin", "hr_admin"),
  LeaveController.updateLeaveBalance,
);

router.get(
  "/balance",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getAllLeaveBalances,
);

router.get(
  "/balance/:employee_id",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getLeaveBalance,
);

// ─── /employee/:id route — before generic /:id routes ────────────────────────
router.get(
  "/employee/:employeeId",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getByEmployee,
);

// ─── /:id action routes — approve/reject before generic /:id ─────────────────
router.put(
  "/:id/approve",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([LeaveManagementAction.Edit]),
  LeaveController.approve,
);

router.put(
  "/:id/reject",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([LeaveManagementAction.Edit]),
  LeaveController.reject,
);

router.put(
  "/:id",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.Edit]),
  validate(updateLeaveSchema),
  LeaveController.updateLeave,
);

router.delete(
  "/:id",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.Delete]),
  LeaveController.deleteLeave,
);

export default router;
