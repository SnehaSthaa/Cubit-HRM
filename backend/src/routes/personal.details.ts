import { Router } from "express";
import { PersonalDetailController } from "../controllers/personal.detail.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { EmployeesAction } from "@/permissions/permission.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  "/:employeeId/personal-details",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([EmployeesAction.View]),
  PersonalDetailController.get,
);

router.put(
  "/:employeeId/personal-details",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([EmployeesAction.Edit]),
  PersonalDetailController.upsert,
);

export default router;
