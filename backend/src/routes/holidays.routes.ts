import { Router } from "express";
import { HolidayController } from "../controllers/holidays.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth.js";
import { EmployeesAction } from "@/permissions/permission.js";
import { validate } from "@/middleware/validate.js";
import {
  createHolidaySchema,
  updateHolidaySchema,
} from "@/validators/holiday.validator.js";

const router = Router();
router.use(authenticate);
router.post(
  "/",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Create]),
  validate(createHolidaySchema),
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
  validate(updateHolidaySchema),
  HolidayController.update,
);
export default router;
