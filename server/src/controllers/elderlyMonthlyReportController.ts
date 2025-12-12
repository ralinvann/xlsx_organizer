import { Request, Response } from "express";
import { ElderlyMonthlyReport } from "../models/ElderlyMonthlyReport";

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

export const createElderlyMonthlyReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
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
    } = req.body ?? {};

    if (!isNonEmptyString(kabupaten) || !isNonEmptyString(puskesmas) || !isNonEmptyString(bulanTahun)) {
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

    const doc = await ElderlyMonthlyReport.create({
      kabupaten: kabupaten.trim(),
      puskesmas: puskesmas.trim(),
      bulanTahun: bulanTahun.trim(),
      metaPairs: Array.isArray(metaPairs) ? metaPairs : [],
      headerKeys,
      headerLabels: Array.isArray(headerLabels)
        ? headerLabels
        : headerKeys.map((k: string) => String(k).toUpperCase()),
      headerOrder: Array.isArray(headerOrder) ? headerOrder : headerKeys,
      rowData,
      fileName,
      sourceSheetName,
      status: "imported",
    });

    res.status(201).json({ message: "Saved", reportId: doc._id, report: doc });
  } catch (e) {
    console.error("createElderlyMonthlyReport error:", e);
    res.status(500).json({ message: "Server error saving report." });
  }
};

export const getElderlyMonthlyReports = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const docs = await ElderlyMonthlyReport.find().sort({ createdAt: -1 }).limit(50);
    res.json({ items: docs });
  } catch (e) {
    console.error("getElderlyMonthlyReports error:", e);
    res.status(500).json({ message: "Server error." });
  }
};

export const getElderlyMonthlyReportById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await ElderlyMonthlyReport.findById(id);
    if (!doc) {
      res.status(404).json({ message: "Not found." });
      return;
    }
    res.json({ item: doc });
  } catch (e) {
    console.error("getElderlyMonthlyReportById error:", e);
    res.status(500).json({ message: "Server error." });
  }
};
