import { Request, Response } from "express";
import User, { UserRole } from "../models/User";
import { hashPassword, comparePassword } from "../utils/hash";
import { signUser } from "../utils/jwt";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload";

/**
 * Helper: normalize role input (admin endpoints only)
 */
function normalizeRole(role: any): UserRole | null {
  const r = String(role ?? "").toLowerCase().trim();
  if (r === "superadmin" || r === "admin" || r === "officer") return r;
  return null;
}

/**
 * @route POST /api/users/register
 * @desc Register a new user (public/officer only)
 * NOTE: Do NOT allow role escalation here. Admin/Superadmin creation must go through admin endpoint.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const firstName = String(req.body.firstName ?? "").trim();
    const middleName = String(req.body.middleName ?? "").trim();
    const lastName = String(req.body.lastName ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    // force role to officer
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

    // ✅ FIX: signUser now expects minimal shape, not whole doc
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
    return;
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Registration failed" });
    return;
  }
};

/**
 * @route POST /api/users/login
 * @desc Authenticate user and return JWT
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
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

    // ✅ FIX: signUser expects { id, role }
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
    return;
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Login failed" });
    return;
  }
};

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 */
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    // ✅ FIX: typed from middleware, no more (req as any)
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
    return;
  } catch (err) {
    console.error("me error:", err);
    res.status(500).json({ message: "Error fetching user" });
    return;
  }
};

/**
 * @route PUT /api/users/me
 * @desc Update current user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
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

    const updated = await User.findByIdAndUpdate(
      userId,
      { $set },
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
    return;
  } catch (err) {
    console.error("updateProfile error:", err);
    res.status(500).json({ message: "Profile update failed" });
    return;
  }
};

/**
 * @route PUT /api/users/me/password
 * @desc Update password for authenticated user
 */
export const updatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
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
    return;
  } catch (err) {
    console.error("updatePassword error:", err);
    res.status(500).json({ message: "Password update failed" });
    return;
  }
};

/**
 * @route POST /api/users/me/avatar
 * @desc Upload or update profile picture to Cloudinary
 */
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
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
    return;
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ message: "Avatar upload failed" });
    return;
  }
};

/**
 * @route GET /api/users
 * @desc Get list of all users (admin/superadmin only)
 */
export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
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
    return;
  } catch (err) {
    console.error("listUsers error:", err);
    res.status(500).json({ message: "Error fetching users" });
    return;
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
    console.error("getUser error:", err);
    res.status(500).json({ message: "Error fetching user" });
    return;
  }
};

/**
 * @route PUT /api/users/:id
 * @desc Update user (admin/superadmin)
 */
export const updateUserByAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const firstName = req.body.firstName !== undefined ? String(req.body.firstName).trim() : undefined;
    const middleName = req.body.middleName !== undefined ? String(req.body.middleName).trim() : undefined;
    const lastName = req.body.lastName !== undefined ? String(req.body.lastName).trim() : undefined;

    // normalize role safely
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

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set },
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
    return;
  } catch (err) {
    console.error("updateUserByAdmin error:", err);
    res.status(500).json({ message: "User update failed" });
    return;
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
    return;
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: "User deletion failed" });
    return;
  }
};
