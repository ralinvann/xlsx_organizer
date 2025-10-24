import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import cloudinary from "../config/cloudinary";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, email, password } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ message: "User already exists" });
      return;
    }

    let uploadedPicture = "";
    if (uploadedPicture){
      const uploadRes = await cloudinary.uploader.upload(uploadedPicture, {
        folder: "profile_pictures",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
      });
      uploadedPicture = uploadRes.secure_url;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ firstName, lastName, email, password: hashed, role: "officer", profilePicture: uploadedPicture });

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ message: "User created successfully", token, user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ token, user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const requireAuth = async (req: Request, res: Response, next: Function): Promise<void> => {
  try {
    const authHeader  = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded: any = jwt.verify(token, JWT_SECRET) as { userId: string };

    const requestingUser = await User.findById(decoded.userId);
    if (!requestingUser || requestingUser.role !== "admin" && requestingUser.role !== "superadmin") {
      res.status(403).json({ message: "Forbidden: Insufficient permissions" });
      return;
    }

    (req as any).user = requestingUser;
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
}