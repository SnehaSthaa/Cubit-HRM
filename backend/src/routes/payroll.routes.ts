import { Router } from "express";
import { PayrollController } from "../controllers/payroll.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { PayrollAction } from "@/permissions/permission.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([PayrollAction.View]),
  PayrollController.getAll,
);
router.post(
  "/",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([PayrollAction.Create]),
  PayrollController.create,
);
router.put(
  "/:id/process",
  authorize("hr_admin", "super_admin"),
  hasRequiredPermission([PayrollAction.Edit]),
  PayrollController.process,
);
router.put(
  "/:id/mark-paid",
  authorize("super_admin"),
  hasRequiredPermission([PayrollAction.Edit]),
  PayrollController.markPaid,
);

export default router;
