import { Router } from "express";
import { EmployeeController } from "../controllers/employee.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get(
  "/",
  authorize("hr_admin", "super_admin", "employee"),
  // hasRequiredPermission([EmployeesAction.View]),
  EmployeeController.getAll,
);

<<<<<<< HEAD
// ── GET /employees/:id ───────────────────────────────────────────────────────
=======
router.post(
  "/",
  authorize("super_admin", "hr_admin"),
  hasRequiredPermission([EmployeesAction.Create]),
  validate(createEmployeeSchema),
  EmployeeController.create,
);

>>>>>>> 400241aa6a8b8221a92fa80baa059e2a4bd016cc
router.get(
  "/:id",
  authorize("hr_admin", "super_admin", "employee"),
  EmployeeController.getById,
);

// ── POST /employees ──────────────────────────────────────────────────────────
router.post(
  "/",
  authorize("hr_admin", "super_admin"),
  EmployeeController.create,
);

// ── PATCH /employees/:id ─────────────────────────────────────────────────────
router.patch(
  "/:id",
  authorize("hr_admin", "super_admin", "employee"),
  EmployeeController.update,
);

// ── DELETE /employees/:id ────────────────────────────────────────────────────
router.delete(
  "/:id",
  authorize("hr_admin", "super_admin"),
  EmployeeController.delete,
);

// ── POST /employees/:id/verify ───────────────────────────────────────────────
router.post(
  "/:id/verify",
  authorize("hr_admin", "super_admin"),
  EmployeeController.verifyEmployee,
);

// ── POST /employees/:id/profile-image ────────────────────────────────────────
router.post(
  "/:id/profile-image",
  authorize("hr_admin", "super_admin", "employee"),
  upload.single("file"),
  EmployeeController.uploadProfileImage,
);

// ── POST /employees/:id/offboarding ──────────────────────────────────────────
router.post(
  "/:id/offboarding",
  authorize("hr_admin", "super_admin"),
  EmployeeController.startOffboarding,
);

export default router;
