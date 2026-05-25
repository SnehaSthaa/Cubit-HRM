import { Router } from "express";
import { AttendanceRequestController } from "../controllers/attendanceRequest.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);
router.post("/", AttendanceRequestController.create);
router.get("/me", AttendanceRequestController.getMyRequests);
router.delete("/:id", AttendanceRequestController.delete);

router.get(
  "/",
  authorize("hr_admin", "super_admin"),
  AttendanceRequestController.getAll,
);

router.get(
  "/:id",
  authorize("hr_admin", "super_admin"),
  AttendanceRequestController.getById,
);

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

export default router;
