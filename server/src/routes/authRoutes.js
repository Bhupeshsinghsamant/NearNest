import { Router } from "express";
import { signup, login, getMe } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate, signupSchema, loginSchema } from "../middleware/validate.js";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.get("/me", requireAuth, getMe);

export default router;
