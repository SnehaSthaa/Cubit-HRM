import { Router } from "express";
import { BankDetailController } from "../controllers/bank.detail.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { BankDetailAction } from "@/permissions/permission.js";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  "/:employeeId/bank-details",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([BankDetailAction.View]),
  BankDetailController.get,
);

router.put(
  "/:employeeId/bank-details",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([BankDetailAction.Edit]),
  BankDetailController.upsert,
);

export default router;
