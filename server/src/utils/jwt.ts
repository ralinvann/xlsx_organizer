// utils/signUser.ts
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { UserRole } from "../models/User";

/**
 * Minimal shape required to sign a JWT
 * (works for hydrated documents, lean objects, or plain objects)
 */
export type JwtUserInput = {
  id: string | Types.ObjectId;
  role: UserRole;
};

/**
 * Generate a JWT for a user
 */
export function signUser(user: JwtUserInput): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign(
    {
      userId: String(user.id), // normalize to string
      role: user.role,
    },
    secret,
    { expiresIn: "7d" }
  );
}
