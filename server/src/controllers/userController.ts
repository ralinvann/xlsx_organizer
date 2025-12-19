import type { RequestHandler } from "express";
import User, { type UserRole } from "../models/User";
import { hashPassword, comparePassword } from "../utils/hash";
import { signUser } from "../utils/signUser";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";

function normalizeRole(role: any): UserRole | null {
  const r = String(role ?? "").toLowerCase().trim();
  if (r === "superadmin" || r === "admin" || r === "officer") return r;
  return null;
}

export const register: RequestHandler = async (req, res) => {
  const firstName = String(req.body.firstName ?? "").trim();
  const middleName = String(req.body.middleName ?? "").trim();
  const lastName = String(req.body.lastName ?? "").trim();
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  const role: UserRole = "officer";

  if (!firstName || !lastName || !email || !password) {
    res.status(400).json({ message: "Missing required fields" });
    return;
  }
  if (!email.includes("@")) {
    res.status(400).json({ message: "Invalid email" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }

  const hashed = await hashPassword(password);

  const user = await User.create({
    firstName,
    middleName,
    lastName,
    email,
    password: hashed,
    role,
  });

  const token = signUser({ id: user._id, role: user.role });

  res.status(201).json({
    token,
    user: {
      id: user._id.toString(),
      firstName: user.firstName,
      middleName: user.middleName ?? "",
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture ?? "",
      createdAt: user.createdAt,
    },
  });
};

export const login: RequestHandler = async (req, res) => {
  const email = String(req.body.email ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "");

  if (!email || !password) {
    res.status(400).json({ message: "Missing credentials" });
    return;
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  const token = signUser({ id: user._id, role: user.role });

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
      createdAt: user.createdAt,
    },
  });
};

export const me: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const user = await User.findById(userId).select("-password");
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
};

export const updateProfile: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const firstName = req.body.firstName !== undefined ? String(req.body.firstName).trim() : undefined;
  const middleName = req.body.middleName !== undefined ? String(req.body.middleName).trim() : undefined;
  const lastName = req.body.lastName !== undefined ? String(req.body.lastName).trim() : undefined;

  const $set: Record<string, any> = {};
  if (firstName !== undefined) $set.firstName = firstName;
  if (middleName !== undefined) $set.middleName = middleName;
  if (lastName !== undefined) $set.lastName = lastName;

  const updated = await User.findByIdAndUpdate(userId, { $set }, { new: true, runValidators: true }).select("-password");
  if (!updated) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({
    user: {
      id: updated._id.toString(),
      firstName: updated.firstName,
      middleName: updated.middleName ?? "",
      lastName: updated.lastName,
      email: updated.email,
      role: updated.role,
      profilePicture: updated.profilePicture ?? "",
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
};

export const updatePassword: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const currentPassword = String(req.body.currentPassword ?? "");
  const newPassword = String(req.body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "Missing password fields" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ message: "New password must be at least 8 characters" });
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const valid = await comparePassword(currentPassword, user.password);
  if (!valid) {
    res.status(400).json({ message: "Current password is incorrect" });
    return;
  }

  user.password = await hashPassword(newPassword);
  await user.save();

  res.status(200).json({ message: "Password updated successfully" });
};

export const uploadAvatar: RequestHandler = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!req.file?.buffer) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  const { url } = await uploadBufferToCloudinary(req.file.buffer, "users/avatars");

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { profilePicture: url } },
    { new: true, runValidators: true }
  ).select("-password");

  if (!updated) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({
    user: {
      id: updated._id.toString(),
      firstName: updated.firstName,
      middleName: updated.middleName ?? "",
      lastName: updated.lastName,
      email: updated.email,
      role: updated.role,
      profilePicture: updated.profilePicture ?? "",
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
};

export const listUsers: RequestHandler = async (_req, res) => {
  const users = await User.find().select("-password").sort({ createdAt: -1 });

  res.status(200).json({
    users: users.map((u) => ({
      id: u._id.toString(),
      firstName: u.firstName,
      middleName: u.middleName ?? "",
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      profilePicture: u.profilePicture ?? "",
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    })),
  });
};

export const getUser: RequestHandler = async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
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
};

export const updateUserByAdmin: RequestHandler = async (req, res) => {
  const firstName = req.body.firstName !== undefined ? String(req.body.firstName).trim() : undefined;
  const middleName = req.body.middleName !== undefined ? String(req.body.middleName).trim() : undefined;
  const lastName = req.body.lastName !== undefined ? String(req.body.lastName).trim() : undefined;

  const roleInput = req.body.role !== undefined ? normalizeRole(req.body.role) : undefined;

  const $set: Record<string, any> = {};
  if (firstName !== undefined) $set.firstName = firstName;
  if (middleName !== undefined) $set.middleName = middleName;
  if (lastName !== undefined) $set.lastName = lastName;

  if (roleInput !== undefined) {
    if (!roleInput) {
      res.status(400).json({ message: "Invalid role" });
      return;
    }
    $set.role = roleInput;
  }

  const updated = await User.findByIdAndUpdate(req.params.id, { $set }, { new: true, runValidators: true }).select("-password");
  if (!updated) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({
    user: {
      id: updated._id.toString(),
      firstName: updated.firstName,
      middleName: updated.middleName ?? "",
      lastName: updated.lastName,
      email: updated.email,
      role: updated.role,
      profilePicture: updated.profilePicture ?? "",
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
};

export const deleteUser: RequestHandler = async (req, res) => {
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ message: "User deleted successfully" });
};
