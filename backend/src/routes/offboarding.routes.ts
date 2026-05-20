import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "@/middleware/auth";
import { Router } from "express";
import { OffboardingController } from "../controllers/offboarding.controller.js";
import { OffboardingAction } from "@/permissions/permission";

const router = Router();

router.use(authenticate);
router.get(
  "/",
  authorize("super_admin", "hr_admin"),
  OffboardingController.getOffboardingEmployees,
);
router.post(
  "/:id/start-offboarding",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([OffboardingAction.Create]),
  OffboardingController.startOffboarding,
);
router.patch(
  "/:id/complete",
  authorize("super_admin", "hr_admin"),
  OffboardingController.completeOffboarding,
);

export default router;
