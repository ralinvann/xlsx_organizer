import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User";
import cloudinary from "../config/cloudinary";
import { requireAuth } from "../middleware/auth";
import { logActivity } from "../utils/activityLogger";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { firstName, middleName, lastName, email, password, profilePicture, phone, workLocation } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      res.status(409).json({ message: "User already exists" });
      return;
    }

    let uploadedPicture = "";
    if (profilePicture) {
      const uploadRes = await cloudinary.uploader.upload(uploadedPicture, {
        folder: "profile_pictures",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
      });
      uploadedPicture = uploadRes.secure_url;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      firstName,
      middleName: String(middleName ?? "").trim(),
      lastName,
      email,
      password: hashed,
      role: "officer",
      profilePicture: uploadedPicture,
      phone: String(phone ?? "").trim(),
      workLocation: String(workLocation ?? "").trim(),
    });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isProd = process.env.NODE_ENV === "production";
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        workLocation: user.workLocation,
      },
    });
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

    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || "unknown";
    await User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      lastLoginIP: clientIP
    });

    // Remember-me option: client may pass `remember: true` to prolong cookie
    const remember = Boolean(req.body?.remember);
    const isProd = process.env.NODE_ENV === "production";
    const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const tokenExpiresIn = remember ? "30d" : "1d";

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: tokenExpiresIn }
    );

    await logActivity({
      userId: String(user._id),
      action: "login",
      details: "Login ke sistem",
      metadata: { ip: clientIP },
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge,
      path: "/",
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        workLocation: user.workLocation,
        lastLoginAt: user.lastLoginAt,
        lastLoginIP: user.lastLoginIP,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (req.user?.id) {
      await logActivity({
        userId: req.user.id,
        action: "logout",
        details: "Logout dari sistem",
      });
    }

    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("token", { httpOnly: true, sameSite: isProd ? "none" : "lax", secure: isProd, path: "/" });
    res.status(200).json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed", error: err });
  }
};

/**
 * GET /auth/me
 * Return current authenticated user by verifying token
 */
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // requireAuth middleware already attached req.user
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        workLocation: user.workLocation,
        lastLoginAt: user.lastLoginAt,
        lastLoginIP: user.lastLoginIP,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};