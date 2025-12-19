import type { RequestHandler } from "express";
import { ElderlyMonthlyReport } from "../models/ElderlyMonthlyReport";
import mongoose from "mongoose";

export const createElderlyMonthlyReport: RequestHandler = async (req, res) => {
  const {
    kabupaten,
    puskesmas,
    bulanTahun,
    metaPairs,
    headerKeys,
    headerLabels,
    headerOrder,
    rowData,
    fileName,
    sourceSheetName,
    status,
  } = req.body ?? {};

  if (!kabupaten || !puskesmas || !bulanTahun) {
    res.status(400).json({ message: "kabupaten, puskesmas, bulanTahun wajib." });
    return;
  }
  if (!Array.isArray(headerKeys) || headerKeys.length === 0) {
    res.status(400).json({ message: "headerKeys wajib dan tidak boleh kosong." });
    return;
  }
  if (!Array.isArray(rowData) || rowData.length === 0) {
    res.status(400).json({ message: "rowData kosong. Tidak ada data untuk disimpan." });
    return;
  }

  const createdBy =
    req.user?.id && mongoose.isValidObjectId(req.user.id)
      ? new mongoose.Types.ObjectId(req.user.id)
      : undefined;

  const doc = await ElderlyMonthlyReport.create({
    kabupaten: String(kabupaten).trim(),
    puskesmas: String(puskesmas).trim(),
    bulanTahun: String(bulanTahun).trim(),

    metaPairs: Array.isArray(metaPairs) ? metaPairs : [],
    headerKeys,
    headerLabels: Array.isArray(headerLabels) ? headerLabels : headerKeys,
    headerOrder: Array.isArray(headerOrder) ? headerOrder : headerKeys,
    rowData,

    fileName: String(fileName ?? "").trim(),
    sourceSheetName: String(sourceSheetName ?? "").trim(),

    status: status === "draft" ? "draft" : "imported",
    createdBy,
  });

  res.status(201).json({ message: "Saved", reportId: doc._id, report: doc });
};

export const getElderlyMonthlyReports: RequestHandler = async (_req, res) => {
  const items = await ElderlyMonthlyReport.find().sort({ createdAt: -1 }).limit(50);
  res.json({ items });
};

export const getElderlyMonthlyReportById: RequestHandler = async (req, res) => {
  const item = await ElderlyMonthlyReport.findById(req.params.id);
  if (!item) {
    res.status(404).json({ message: "Not found." });
    return;
  }
  res.json({ item });
};

export const getElderlyMonthlyReportSummary: RequestHandler = async (_req, res) => {
  const latest = await ElderlyMonthlyReport.findOne().sort({ createdAt: -1 });

  if (!latest) {
    res.json({
      summary: {
        totalMeasuredThisMonth: 0,
        interventionsThisMonth: 0,
        urgentCasesThisMonth: 0,
        healthImprovementPct: null,
        latestBulanTahun: null,
      },
      recentActivities: [],
    });
    return;
  }

  const rows = Array.isArray((latest as any).rowData) ? (latest as any).rowData : [];

  res.json({
    summary: {
      totalMeasuredThisMonth: rows.length,
      interventionsThisMonth: 0,
      urgentCasesThisMonth: 0,
      healthImprovementPct: null,
      latestBulanTahun: (latest as any).bulanTahun ?? null,
    },
    recentActivities: [],
  });
};
