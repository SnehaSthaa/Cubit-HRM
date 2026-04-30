import { Router } from "express";
import { EmployeeDocumentController } from "../controllers/employee.document.controller";
import { uploadDocuments } from "@/middleware/upload.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth";
import { EmployeesAction } from "@/permissions/permission";

const router = Router();
router.use(authenticate);
router.post(
  "/:employeeId/documents",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Create]),
  uploadDocuments.single("file"),

  EmployeeDocumentController.upload,
);

router.get(
  "/:employeeId/documents",
  hasRequiredPermission([EmployeesAction.View]),
  EmployeeDocumentController.getByEmployee,
);
router.patch(
  "/documents/:docId/status",
  hasRequiredPermission([EmployeesAction.Edit]),
  EmployeeDocumentController.updateDocumentStatus,
);

router.delete(
  "/documents/:id",
  hasRequiredPermission([EmployeesAction.Delete]),
  EmployeeDocumentController.delete,
);

export default router;
