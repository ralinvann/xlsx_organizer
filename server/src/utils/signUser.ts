// utils/signUser.ts
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";
import type { UserRole } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

type SignUserInput = {
  id: string | Types.ObjectId;
  role: UserRole;
};

export function signUser(payload: SignUserInput): string {
  return jwt.sign(
    { userId: payload.id.toString(), role: payload.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
