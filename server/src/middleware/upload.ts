import multer from "multer";

/**
 * Multer setup for in-memory image uploads
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
});
