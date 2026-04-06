import mongoose, { Schema } from "mongoose";

export interface ILocationConfig extends mongoose.Document {
  kabupaten: string;
  desaList: string[];
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LocationConfigSchema = new Schema<ILocationConfig>(
  {
    kabupaten: { type: String, required: true, unique: true, trim: true },
    desaList: { type: [String], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "location_configs" }
);

export const LocationConfig =
  mongoose.models.LocationConfig ||
  mongoose.model<ILocationConfig>("LocationConfig", LocationConfigSchema);
