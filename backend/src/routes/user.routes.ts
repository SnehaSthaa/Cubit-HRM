import { Router } from "express";
import { UserController } from "@/controllers/user.controller";
import { authenticate, authorize } from "@/middleware/auth";

const router = Router();
router.get(
  "/me",
  authenticate,

  UserController.getMe,
);
router.patch(
  "/me/change-password",
  authenticate,
  UserController.changePassword,
);

export default router;
