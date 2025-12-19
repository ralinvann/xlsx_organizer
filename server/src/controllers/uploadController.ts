import type { RequestHandler } from "express";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage: RequestHandler = async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  const fileStr = req.file.buffer.toString("base64");
  const uploadResponse = await cloudinary.uploader.upload(
    `data:${req.file.mimetype};base64,${fileStr}`,
    { folder: "uploads" }
  );

  res.status(200).json({
    message: "Upload successful",
    url: uploadResponse.secure_url,
  });
};
