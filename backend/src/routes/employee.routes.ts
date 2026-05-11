import { Router } from "express";
import { EmployeeController } from "../controllers/employee.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { uploadImage } from "@/middleware/upload.js";
import { EmployeesAction } from "@/permissions/permission.js";
import { validate } from "@/middleware/validate.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/validators/employee.validator.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("hr_admin", "super_admin", "employee"),
  hasRequiredPermission([EmployeesAction.View]),
  EmployeeController.getAll,
);
router.post(
  "/",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Create]),
  validate(createEmployeeSchema),
  EmployeeController.create,
);
router.get(
  "/:id",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.View]),
  EmployeeController.getById,
);
router.put(
  "/:id",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Edit]),
  validate(updateEmployeeSchema),
  EmployeeController.update,
);
router.delete(
  "/:id",
  authorize("super_admin"),
  hasRequiredPermission([EmployeesAction.Delete]),
  EmployeeController.delete,
);
router.patch(
  "/:id/verify",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Edit]),
  EmployeeController.verifyEmployee,
);
router.post(
  "/:id/profile-image",
  authenticate,
  authorize("super_admin", "hr_admin"), // add role check
  hasRequiredPermission([EmployeesAction.Edit]),
  uploadImage.single("file"),
  EmployeeController.uploadProfileImage,
);

export default router;
