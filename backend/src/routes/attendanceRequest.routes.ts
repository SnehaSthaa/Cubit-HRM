import { Router } from "express";
import { AttendanceRequestController } from "../controllers/attendanceRequest.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

// ── Employee routes (no role restriction) ─────────────────────────────────────
router.post("/", AttendanceRequestController.create);

// ── Must be before /:id ───────────────────────────────────────────────────────
router.get("/me", AttendanceRequestController.getMyRequests);

// ── HR/Admin only ─────────────────────────────────────────────────────────────
router.get(
  "/",
  authorize("hr_admin", "super_admin"),
  AttendanceRequestController.getAll,
);

// ── Employee can view their own; HR/Admin can view any ───────────────────────
// Authorization is handled inside the controller (ownership check)
router.get("/:id", AttendanceRequestController.getById);

router.patch(
  "/:id/approve",
  authorize("hr_admin", "super_admin"),
  AttendanceRequestController.approve,
);

router.patch(
  "/:id/reject",
  authorize("hr_admin", "super_admin"),
  AttendanceRequestController.reject,
);

// ── Delete (employee can delete their own pending; HR/Admin can delete any) ───
router.delete("/:id", AttendanceRequestController.delete);

export default router;
