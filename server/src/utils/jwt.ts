import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { UserRole } from "../models/User";

export type JwtUserInput = {
  id: string | Types.ObjectId;
  role: UserRole;
};

export type JwtPayload = {
  userId: string;
  role: UserRole;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");
  return secret;
}

export function signUser(user: JwtUserInput): string {
  return jwt.sign(
    { userId: String(user.id), role: user.role } satisfies JwtPayload,
    getSecret(),
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload;
}
