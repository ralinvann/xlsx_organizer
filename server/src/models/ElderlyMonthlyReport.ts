import mongoose, { Schema, Types } from "mongoose";

export type ElderlyMonthlyReportStatus = "draft" | "imported" | "generated";

const MergeRangeSchema = new Schema(
  {
    s: { r: Number, c: Number },
    e: { r: Number, c: Number },
  },
  { _id: false }
);

const HeaderBlockSchema = new Schema(
  {
    start: { type: Number },
    end: { type: Number },
    rows: { type: [[Schema.Types.Mixed]] },
    merges: { type: [MergeRangeSchema] },
  },
  { _id: false }
);

const WorksheetDataSchema = new Schema(
  {
    worksheetName: { type: String, required: true, trim: true },
    puskesmas: { type: String, required: true, trim: true },
    kabupaten: { type: String, required: true, trim: true },
    bulanTahun: { type: String, required: true, trim: true },
    metaPairs: [
      {
        key: { type: String, trim: true },
        value: { type: String, trim: true },
      },
    ],
    headerKeys: { type: [String], required: true },
    headerLabels: { type: [String], required: true },
    headerOrder: { type: [String], required: true },
    rowData: { type: [Schema.Types.Mixed], required: true },
    sourceSheetName: { type: String, trim: true },
    headerBlock: { type: HeaderBlockSchema },
  },
  { _id: false }
);

const ElderlyMonthlyReportSchema = new Schema(
  {
    kabupaten: { type: String, required: true, trim: true },
    bulanTahun: { type: String, required: true, trim: true },

    // Support both single and multiple worksheets
    worksheets: { type: [WorksheetDataSchema], required: true },

    // Legacy single worksheet fields (for backward compatibility)
    puskesmas: { type: String, trim: true },
    metaPairs: [
      {
        key: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],
    headerKeys: { type: [String] },
    headerLabels: { type: [String] },
    headerOrder: { type: [String] },
    rowData: { type: [Schema.Types.Mixed] },

    fileName: { type: String, trim: true },
    generatedReportPath: { type: String, trim: true },
    status: { type: String, enum: ["draft", "imported", "generated"], default: "imported" },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
  },
  { timestamps: true }
);

export const ElderlyMonthlyReport =
  mongoose.models.ElderlyMonthlyReport ||
  mongoose.model("ElderlyMonthlyReport", ElderlyMonthlyReportSchema);
