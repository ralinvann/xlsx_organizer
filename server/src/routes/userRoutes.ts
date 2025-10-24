import { Router } from "express";
import {
  register, login, me, updateProfile, updatePassword,
  uploadAvatar, listUsers, getUser, updateUserByAdmin, deleteUser
} from "../controllers/userController";
import { requireAuth, requireRole } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();

// Auth
router.post("/register", register);
router.post("/login", login);

// Me
router.get("/me", requireAuth, me);
router.put("/me", requireAuth, updateProfile);
router.put("/me/password", requireAuth, updatePassword);
router.post("/me/avatar", requireAuth, upload.single("avatar"), uploadAvatar);

// Admin
router.get("/", requireAuth, requireRole("admin", "superadmin"), listUsers);
router.get("/:id", requireAuth, requireRole("admin", "superadmin"), getUser);
router.put("/:id", requireAuth, requireRole("admin", "superadmin"), updateUserByAdmin);
router.delete("/:id", requireAuth, requireRole("superadmin"), deleteUser);

export default router;
