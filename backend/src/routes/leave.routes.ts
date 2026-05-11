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

// ✅ All static/specific routes BEFORE any /:id param routes
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
router.patch(
  // ✅ PATCH, no /leaves/ prefix
  "/balance/customize",
  authorize("super_admin", "hr_admin"),
  LeaveController.updateLeaveBalance,
);
router.get(
  // ✅ moved above /:id
  "/employee/:employeeId",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getByEmployee,
);

// ✅ Param routes come last
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
