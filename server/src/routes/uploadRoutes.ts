// routes/uploadRoutes.ts
import express from "express";
import { upload } from "../middleware/upload";
import { uploadImage } from "../controllers/uploadController";
import { asyncHandler } from "../utils/asyncHandler";

const router = express.Router();

// POST /api/upload
router.post(
  "/",
  upload.single("image"),
  asyncHandler(uploadImage)
);

export default router;
