import mongoose, { Schema, Types } from "mongoose";

export interface ElderlyPersonSource {
  report: Types.ObjectId;
  bulanTahun: string;
  worksheetName?: string;
  rowIndex?: number;
}

export interface ElderlyPersonDocument extends mongoose.Document {
  nik: string;
  name?: string;
  gender?: "L" | "P";
  age?: number;
  kabupaten?: string;
  puskesmas?: string;
  flags: {
    data: boolean;
    screened: boolean;
    empowered: boolean;
  };
  sources: ElderlyPersonSource[];
  lastReport?: Types.ObjectId;
  lastBulanTahun?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ElderlyPersonSourceSchema = new Schema<ElderlyPersonSource>(
  {
    report: { type: Schema.Types.ObjectId, ref: "ElderlyMonthlyReport", required: true },
    bulanTahun: { type: String, required: true, trim: true },
    worksheetName: { type: String, trim: true },
    rowIndex: { type: Number },
  },
  { _id: false }
);

const ElderlyPersonSchema = new Schema<ElderlyPersonDocument>(
  {
    nik: { type: String, required: true, trim: true, unique: true },
    name: { type: String, trim: true },
    gender: { type: String, enum: ["L", "P"], trim: true },
    age: { type: Number },
    kabupaten: { type: String, trim: true },
    puskesmas: { type: String, trim: true },
    flags: {
      data: { type: Boolean, default: false },
      screened: { type: Boolean, default: false },
      empowered: { type: Boolean, default: false },
    },
    sources: { type: [ElderlyPersonSourceSchema], default: [] },
    lastReport: { type: Schema.Types.ObjectId, ref: "ElderlyMonthlyReport" },
    lastBulanTahun: { type: String, trim: true },
  },
  { timestamps: true }
);

export const ElderlyPerson =
  mongoose.models.ElderlyPerson ||
  mongoose.model<ElderlyPersonDocument>("ElderlyPerson", ElderlyPersonSchema);
