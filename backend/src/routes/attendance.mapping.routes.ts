import { Router } from "express";
import {
  getAttendances,
  getAttendanceById,
  getAttendanceByEmployee,
  createAttendance,
  bulkCreateAttendance,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
  checkIn,
  checkOut,
} from "../controllers/atendance.mapping.js";

const router = Router();

router.get("/summary", getAttendanceSummary);

router.post("/check-in", checkIn);
router.post("/check-out", checkOut);

router.post("/bulk", bulkCreateAttendance);

router.get("/employee/:employee_id", getAttendanceByEmployee);

router.get("/", getAttendances);
router.get("/:id", getAttendanceById);
router.post("/", createAttendance);
router.patch("/:id", updateAttendance);
router.delete("/:id", deleteAttendance);

export default router;
