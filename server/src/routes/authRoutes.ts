import express from "express";
import { signup, login, getCurrentUser, logout } from "../controllers/authController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = express.Router();

// Public signup (only officer role by default)
router.post("/signup", signup);

// Public login
router.post("/login", login);

// Get current user (requires valid token)
router.get("/me", requireAuth, getCurrentUser);

// Logout (clears cookie)
router.post("/logout", logout);

export default router;
