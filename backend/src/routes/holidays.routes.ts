import { Router } from "express";
import { HolidayController } from "../controllers/holidays.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth.js";
import { EmployeesAction } from "@/permissions/permission.js";

const router = Router();
router.use(authenticate);
router.post(
  "/",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Create]),
  HolidayController.create,
);
router.get(
  "/",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([EmployeesAction.View]),
  HolidayController.getall,
);
router.delete(
  "/:id",
  authorize("super_admin"),
  hasRequiredPermission([EmployeesAction.Delete]),
  HolidayController.delete,
);
router.put(
  "/:id",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Edit]),
  HolidayController.update,
);
export default router;
