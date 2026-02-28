import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

export const signUser = (user: Pick<IUser, "_id" | "role">): string => {
  return jwt.sign(
    { id: String(user._id), role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
};
