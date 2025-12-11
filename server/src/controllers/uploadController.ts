// controllers/uploadController.ts
import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";

/**
 * Configure Cloudinary
 */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary
 */
export const uploadImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Convert the buffer to base64
    const fileStr = req.file.buffer.toString("base64");
    const uploadResponse = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${fileStr}`,
      {
        folder: "uploads", // optional: group your uploads in Cloudinary
      }
    );

    return res.status(200).json({
      message: "Upload successful",
      url: uploadResponse.secure_url,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({ message: "Image upload failed", error });
  }
};
