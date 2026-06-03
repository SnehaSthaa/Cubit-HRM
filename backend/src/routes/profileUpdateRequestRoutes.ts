import { Router } from "express";
import { ProfileUpdateRequestController } from "../controllers/profileUpdateRequest.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { ProfileRequestAction } from "@/permissions/permission.js";

const router = Router();

// All routes require a valid JWT
router.use(authenticate);

// ── Employee routes ───────────────────────────────────────────────────────────

// Employee views their own requests
router.get(
  "/my",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([ProfileRequestAction.View]),
  ProfileUpdateRequestController.getMy,
);

// Employee submits a new profile update request
router.post(
  "/",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([ProfileRequestAction.Create]),
  ProfileUpdateRequestController.create,
);

// Employee cancels their own pending request
router.delete(
  "/:id",
  authorize("super_admin", "hr_admin", "employee"),
  hasRequiredPermission([ProfileRequestAction.Delete]),
  ProfileUpdateRequestController.cancel,
);

// ── HR / Admin routes ─────────────────────────────────────────────────────────

// HR lists all pending requests
router.get(
  "/",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([ProfileRequestAction.View]),
  ProfileUpdateRequestController.getAll,
);

// HR views a single request
router.get(
  "/:id",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([ProfileRequestAction.View]),
  ProfileUpdateRequestController.getById,
);

// HR approves a request
router.patch(
  "/:id/approve",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([ProfileRequestAction.Review]),
  ProfileUpdateRequestController.approve,
);

// HR rejects a request
router.patch(
  "/:id/reject",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([ProfileRequestAction.Review]),
  ProfileUpdateRequestController.reject,
);

export default router;
