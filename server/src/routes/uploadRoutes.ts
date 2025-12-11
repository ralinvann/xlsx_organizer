// routes/uploadRoutes.ts
import express from "express";
import { upload } from "../middleware/upload";
import { uploadImage } from "../controllers/uploadController";

const router = express.Router();

// POST /api/upload
router.post("/", upload.single("image"), async (req, res, next) => {
  try {
	await uploadImage(req, res);
  } catch (err) {
	next(err);
  }
});

export default router;
