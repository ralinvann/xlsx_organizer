import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  role: "superadmin" | "admin" | "officer";
  profilePicture?: string;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  refreshTokens?: Array<{
    tokenHash: string;
    createdAt: Date;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }>;
  createdAt: Date;
}

const userSchema = new Schema<IUser>({
  firstName: { type: String, required: true },
  middleName: { type: String, default: "" }, // optional
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["superadmin", "admin", "officer"],
    default: "officer",
  },
  profilePicture: { type: String, default: "" },
  lastLoginAt: { type: Date },
  lastLoginIP: { type: String },
  refreshTokens: [
    {
      tokenHash: { type: String },
      createdAt: { type: Date },
      expiresAt: { type: Date },
      userAgent: { type: String },
      ip: { type: String },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IUser>("User", userSchema);
