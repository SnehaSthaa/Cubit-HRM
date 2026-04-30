import { Router } from "express";
import { EmployeeEmergencyController } from "@/controllers/employee.emergency.controller";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth";
import { EmployeesAction } from "@/permissions/permission";

const router = Router();
router.use(authenticate);

router.post(
  "/:employeeId/emergency-contacts",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Create]),
  EmployeeEmergencyController.addEmergencyContact,
);

router.get(
  "/:employeeId/emergency-contacts",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.View]),
  EmployeeEmergencyController.getEmergencyContacts,
);

router.patch(
  "/emergency-contacts/:contactId",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Edit]),
  EmployeeEmergencyController.updateEmergencyContact,
);

router.delete(
  "/emergency-contacts/:contactId",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Delete]),
  EmployeeEmergencyController.deleteEmergencyContact,
);

export default router;
