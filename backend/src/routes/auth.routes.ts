import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "@/middleware/validate.js";
import { loginSchema } from "@/validators/auth.validators.js";
import { AuthService } from "../services/auth.service.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", validate(loginSchema), AuthController.login);
router.post("/switch-role", authenticate, async (req, res) => {
  try {
    const token = await AuthService.switchRole(req.user!.userId, req.body.role);
    res.json({ success: true, token });
  } catch (err: any) {
    res.status(403).json({ success: false, message: err.message });
  }
});

export default router;
