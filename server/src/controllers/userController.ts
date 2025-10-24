import { Request, Response } from "express";
import User from "../models/User";
import { hashPassword, comparePassword } from "../utils/hash";
import { signUser } from "../utils/jwt";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";

/**
 * @route POST /api/users/register
 * @desc Register a new user
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, middleName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: "Missing required fields" });
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
      middleName: middleName ?? "",
      lastName,
      email,
      password: hashed,
      role: role ?? "officer",
    });

    const token = signUser(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: String(err) });
  }
};

/**
 * @route POST /api/users/login
 * @desc Authenticate user and return JWT
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

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

    const token = signUser(user);

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
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: String(err) });
  }
};

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user", error: String(err) });
  }
};

/**
 * @route PUT /api/users/me
 * @desc Update current user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, middleName, lastName } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: { firstName, middleName, lastName } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Profile update failed", error: String(err) });
  }
};

/**
 * @route PUT /api/users/me/password
 * @desc Update password for authenticated user
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user!.id);
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
  } catch (err) {
    res.status(500).json({ message: "Password update failed", error: String(err) });
  }
};

/**
 * @route POST /api/users/me/avatar
 * @desc Upload or update profile picture to Cloudinary
 */
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { url } = await uploadBufferToCloudinary(req.file.buffer, "users/avatars");

    const updated = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: { profilePicture: url } },
      { new: true }
    ).select("-password");

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Avatar upload failed", error: String(err) });
  }
};

/**
 * @route GET /api/users
 * @desc Get list of all users (admin/superadmin only)
 */
export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: String(err) });
  }
};

/**
 * @route GET /api/users/:id
 * @desc Get user by ID (admin/superadmin)
 */
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user", error: String(err) });
  }
};

/**
 * @route PUT /api/users/:id
 * @desc Update user (admin/superadmin)
 */
export const updateUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, middleName, lastName, role } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { firstName, middleName, lastName, role } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "User update failed", error: String(err) });
  }
};

/**
 * @route DELETE /api/users/:id
 * @desc Delete user (superadmin only)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "User deletion failed", error: String(err) });
  }
};
