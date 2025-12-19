import { Router } from "express";
import {
  register,
  login,
  me,
  updateProfile,
  updatePassword,
  uploadAvatar,
  listUsers,
  getUser,
  updateUserByAdmin,
  deleteUser,
} from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Auth
router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));

// Me
router.get("/me", requireAuth, asyncHandler(me));
router.put("/me", requireAuth, asyncHandler(updateProfile));
router.put("/me/password", requireAuth, asyncHandler(updatePassword));
router.post(
  "/me/avatar",
  requireAuth,
  upload.single("avatar"),
  asyncHandler(uploadAvatar)
);

// Admin
router.get("/", requireAuth, requireRole("admin", "superadmin"), asyncHandler(listUsers));
router.get("/:id", requireAuth, requireRole("admin", "superadmin"), asyncHandler(getUser));
router.put("/:id", requireAuth, requireRole("admin", "superadmin"), asyncHandler(updateUserByAdmin));
router.delete("/:id", requireAuth, requireRole("superadmin"), asyncHandler(deleteUser));

export default router;
