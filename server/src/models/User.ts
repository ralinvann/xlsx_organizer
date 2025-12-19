// models/User.ts
import mongoose, { Schema, HydratedDocument, Types } from "mongoose";

export type UserRole = "superadmin" | "admin" | "officer";

export interface IUser {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  profilePicture?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// HydratedDocument ensures _id is Types.ObjectId (not unknown)
export type UserDoc = HydratedDocument<IUser> & { _id: Types.ObjectId };

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    middleName: { type: String, default: "" },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["superadmin", "admin", "officer"],
      default: "officer",
    },
    profilePicture: { type: String, default: "" },
  },
  {
    timestamps: true, // creates createdAt + updatedAt automatically
  }
);

const User = mongoose.model<IUser>("User", userSchema);
export default User;
