import mongoose, { Schema, Types } from "mongoose";

export type ElderlyMonthlyReportStatus = "draft" | "imported";

const ElderlyMonthlyReportSchema = new Schema(
  {
    kabupaten: { type: String, required: true, trim: true },
    puskesmas: { type: String, required: true, trim: true },
    bulanTahun: { type: String, required: true, trim: true },

    // keep the exact “B2/B3/B4 labels” too (optional but useful)
    metaPairs: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],

    // dynamic table headers (from your existing parsing)
    headerKeys: { type: [String], required: true },
    headerLabels: { type: [String], required: true },
    headerOrder: { type: [String], required: true },

    // dynamic row objects (store as-is)
    rowData: { type: [Schema.Types.Mixed], required: true },

    fileName: { type: String, trim: true },
    sourceSheetName: { type: String, trim: true },

    status: { type: String, enum: ["draft", "imported"], default: "imported" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

export const ElderlyMonthlyReport =
  mongoose.models.ElderlyMonthlyReport ||
  mongoose.model("ElderlyMonthlyReport", ElderlyMonthlyReportSchema);
