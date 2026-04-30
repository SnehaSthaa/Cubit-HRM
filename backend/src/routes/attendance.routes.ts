import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller.js";
import {
  authenticate,
  authorize,
  hasRequiredPermission,
} from "../middleware/auth.js";
import { AttendanceAction } from "@/permissions/permission.js";

const router = Router();

router.use(authenticate);

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

export default router;
