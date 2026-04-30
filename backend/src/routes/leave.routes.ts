import { Router } from "express";
import { LeaveController } from "../controllers/leave.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { LeaveManagementAction } from "@/permissions/permission.js";

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
  LeaveController.create,
);
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
router.delete(
  "/:id",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.Delete]),
  LeaveController.deleteLeave,
);
router.get(
  "/balance/:employee_id",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getLeaveBalance,
);
router.get(
  "/balance",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getAllLeaveBalances,
);

router.get(
  "/employee/:employeeId",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.View]),
  LeaveController.getByEmployee,
);
router.put(
  "/:id",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([LeaveManagementAction.Edit]),
  LeaveController.updateLeave,
);
export default router;
