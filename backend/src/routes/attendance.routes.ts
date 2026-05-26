import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller.js";
import { authenticate, hasRequiredPermission } from "../middleware/auth.js";
import { AttendanceAction } from "@/permissions/permission.js";

const router = Router();

router.use(authenticate);

router.get(
  "/summary",
  hasRequiredPermission([AttendanceAction.View]),
  AttendanceController.getSummary,
);

router.get(
  "/employee/:employee_id",
  hasRequiredPermission([AttendanceAction.View]),
  AttendanceController.getByEmployee,
);

router.post(
  "/check-in",
  hasRequiredPermission([AttendanceAction.Create]),
  AttendanceController.checkIn,
);

router.post(
  "/check-out",
  hasRequiredPermission([AttendanceAction.Create]),
  AttendanceController.checkOut,
);

router.post(
  "/bulk",
  hasRequiredPermission([AttendanceAction.Create]),
  AttendanceController.bulkCreate,
);

// ── Parameterized / root routes last ─────────────────────────────────────────

router.get(
  "/",
  hasRequiredPermission([AttendanceAction.View]),
  AttendanceController.getAll,
);

router.post(
  "/",
  hasRequiredPermission([AttendanceAction.Create]),
  AttendanceController.create,
);

router.get(
  "/:id",
  hasRequiredPermission([AttendanceAction.View]),
  AttendanceController.getById,
);

router.patch(
  "/:id",
  hasRequiredPermission([AttendanceAction.Edit]),
  AttendanceController.update,
);

router.delete(
  "/:id",
  hasRequiredPermission([AttendanceAction.Delete]),
  AttendanceController.delete,
);

export default router;
