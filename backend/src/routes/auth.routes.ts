import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "@/middleware/validate.js";
import { loginSchema } from "@/validators/auth.validators.js";

const router = Router();

router.post("/register", AuthController.register);
router.post("/login", validate(loginSchema), AuthController.login);

export default router;
