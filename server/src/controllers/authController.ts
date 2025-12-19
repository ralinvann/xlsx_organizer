// controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User, { UserRole } from "../models/User";
import cloudinary from "../config/cloudinary";

type JwtPayload = {
  userId: string;
  role: UserRole;
};

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

export const signup = async (req: Request, res: Response): Promise<void> => {
  const { firstName, middleName, lastName, email, password, profilePicture } = req.body;

  try {
    if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      res.status(400).json({ message: "firstName, lastName, email, password wajib." });
      return;
    }

    const emailNorm = String(email).toLowerCase().trim();

    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      res.status(409).json({ message: "User already exists" });
      return;
    }

    // ✅ FIX: upload the incoming string (base64/url) - your previous code uploaded `uploadedPicture` which was ""
    let uploadedPicture = "";
    if (isNonEmptyString(profilePicture)) {
      const uploadRes = await cloudinary.uploader.upload(String(profilePicture), {
        folder: "profile_pictures",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
      });
      uploadedPicture = uploadRes.secure_url;
    }

    const hashed = await bcrypt.hash(String(password), 10);

    const user = await User.create({
      firstName: String(firstName).trim(),
      middleName: String(middleName ?? "").trim(),
      lastName: String(lastName).trim(),
      email: emailNorm,
      password: hashed,
      role: "officer",
      profilePicture: uploadedPicture,
    });

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role } satisfies JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "User created successfully",
      token,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName ?? "",
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture ?? "",
      },
    });
    return;
  } catch (err) {
    console.error("signup error:", err);
    res.status(500).json({ message: "Server error" });
    return;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      res.status(400).json({ message: "Email dan password wajib." });
      return;
    }

    const emailNorm = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: emailNorm });
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const match = await bcrypt.compare(String(password), String(user.password));
    if (!match) {
      res.status(401).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role } satisfies JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName ?? "",
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture ?? "",
      },
    });
    return;
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Server error" });
    return;
  }
};

/**
 * GET /auth/me
 * Return current authenticated user by verifying token
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
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
        id: user._id.toString(),
        firstName: user.firstName,
        middleName: user.middleName ?? "",
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture ?? "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
    return;
  } catch (err) {
    console.error("getCurrentUser error:", err);
    res.status(500).json({ message: "Server error" });
    return;
  }
};
