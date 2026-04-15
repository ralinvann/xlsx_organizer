import express from "express";
import { signup, login, getCurrentUser, logout, forgotPassword, resetPassword, changePassword } from "../controllers/authController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = express.Router();

// Public signup (only officer role by default)
router.post("/signup", signup);

// Public login
router.post("/login", login);

// Forgot password (sends reset email)
router.post("/forgot-password", forgotPassword);

// Reset password (validates token + sets new password)
router.post("/reset-password", resetPassword);

// Change password (requires authenticated user)
router.post("/change-password", requireAuth, changePassword);

// Get current user (requires valid token)
router.get("/me", requireAuth, getCurrentUser);

// Logout (clears cookie)
router.post("/logout", requireAuth, logout);

export default router;
