import { Request, Response } from "express";
import { ElderlyMonthlyReport } from "../models/ElderlyMonthlyReport";
import { generateMonthlyReportExcel } from "../utils/generateMonthlyReportExcel";
import * as fs from "fs";
import * as path from "path";

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function convertPostAlamatToBinary(worksheet: any): any {
  if (!worksheet.headerKeys || !Array.isArray(worksheet.rowData)) {
    return worksheet;
  }

  const alamatIndex = worksheet.headerKeys.findIndex(
    (key: string) => key.toLowerCase() === "alamat"
  );

  if (alamatIndex === -1 || alamatIndex >= worksheet.headerKeys.length - 1) {
    return worksheet;
  }

  const processedRows = worksheet.rowData.map((row: any) => {
    const newRow = { ...row };
    for (let colIdx = alamatIndex + 1; colIdx < worksheet.headerKeys.length; colIdx++) {
      const key = worksheet.headerKeys[colIdx];
      const value = newRow[key];
      newRow[key] =
        value !== null && value !== undefined && String(value).trim() !== ""
          ? "Yes"
          : "No";
    }
    return newRow;
  });

  return {
    ...worksheet,
    rowData: processedRows,
  };
}

export const createElderlyMonthlyReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      fileName,
      kabupaten,
      bulanTahun,
      worksheets,
      // Legacy single-worksheet fields (for backward compatibility)
      puskesmas,
      metaPairs,
      headerKeys,
      headerLabels,
      headerOrder,
      rowData,
      sourceSheetName,
    } = req.body ?? {};

    if (!isNonEmptyString(kabupaten) || !isNonEmptyString(bulanTahun)) {
      res
        .status(400)
        .json({ message: "kabupaten and bulanTahun are required." });
      return;
    }

    let worksheetsData: any[];

    if (Array.isArray(worksheets) && worksheets.length > 0) {
      worksheetsData = worksheets.map((ws) => convertPostAlamatToBinary(ws));

      for (const ws of worksheetsData) {
        if (
          !Array.isArray(ws.headerKeys) ||
          ws.headerKeys.length === 0
        ) {
          res.status(400).json({
            message: `Worksheet "${ws.worksheetName}" must have headerKeys.`,
          });
          return;
        }
        if (!Array.isArray(ws.rowData) || ws.rowData.length === 0) {
          res.status(400).json({
            message: `Worksheet "${ws.worksheetName}" has no data.`,
          });
          return;
        }
      }
    } else if (
      puskesmas &&
      Array.isArray(headerKeys) &&
      headerKeys.length > 0 &&
      Array.isArray(rowData) &&
      rowData.length > 0
    ) {
      // Legacy single-worksheet payload
      const singleWs = {
        worksheetName: sourceSheetName || "Sheet1",
        puskesmas: puskesmas.trim(),
        kabupaten: kabupaten.trim(),
        bulanTahun: bulanTahun.trim(),
        metaPairs: Array.isArray(metaPairs) ? metaPairs : [],
        headerKeys,
        headerLabels: Array.isArray(headerLabels)
          ? headerLabels
          : headerKeys.map((k: string) => String(k).toUpperCase()),
        headerOrder: Array.isArray(headerOrder) ? headerOrder : headerKeys,
        rowData,
        sourceSheetName,
      };
      worksheetsData = [convertPostAlamatToBinary(singleWs)];
    } else {
      res.status(400).json({
        message:
          "Either worksheets array or legacy single-worksheet fields (puskesmas, headerKeys, rowData) must be provided.",
      });
      return;
    }

    let generatedReportPath: string | null = null;
    try {
      const excelBuffer = await generateMonthlyReportExcel({
        kabupaten: kabupaten.trim(),
        bulanTahun: bulanTahun.trim(),
        worksheets: worksheetsData,
      });

      const reportsDir = path.join(process.cwd(), "reports");
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const filename = `monthly_report_${kabupaten}_${timestamp}.xlsx`;
      const filePath = path.join(reportsDir, filename);

      fs.writeFileSync(filePath, excelBuffer);
      generatedReportPath = filePath;
    } catch (excelError) {
      console.warn("Failed to generate Excel report:", excelError);
    }

    const doc = await ElderlyMonthlyReport.create({
      kabupaten: kabupaten.trim(),
      bulanTahun: bulanTahun.trim(),
      worksheets: worksheetsData,
      puskesmas:
        worksheetsData[0]?.puskesmas || worksheetsData[0]?.worksheetName,
      metaPairs: worksheetsData[0]?.metaPairs ?? [],
      headerKeys: worksheetsData[0]?.headerKeys ?? [],
      headerLabels: worksheetsData[0]?.headerLabels ?? [],
      headerOrder: worksheetsData[0]?.headerOrder ?? [],
      rowData: worksheetsData[0]?.rowData ?? [],
      fileName,
      generatedReportPath,
      status: "generated",
    });

    res.status(201).json({
      message: "Report created and Excel generated",
      reportId: doc._id,
      report: doc,
      excelPath: generatedReportPath || null,
      worksheetCount: worksheetsData.length,
    });
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
    const docs = await ElderlyMonthlyReport.find()
      .sort({ createdAt: -1 })
      .limit(50);
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

export const downloadElderlyMonthlyReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const doc = await ElderlyMonthlyReport.findById(id);
    if (!doc) {
      res.status(404).json({ message: "Report not found." });
      return;
    }

    // Always regenerate to ensure latest code is used
    try {
      const excelBuffer = await generateMonthlyReportExcel({
        kabupaten: doc.kabupaten,
        bulanTahun: doc.bulanTahun,
        worksheets: doc.worksheets || [
          {
            worksheetName: doc.sourceSheetName || "Sheet1",
            puskesmas: doc.puskesmas,
            kabupaten: doc.kabupaten,
            bulanTahun: doc.bulanTahun,
            headerKeys: doc.headerKeys || [],
            headerLabels: doc.headerLabels || [],
            headerOrder: doc.headerOrder || [],
            rowData: doc.rowData || [],
          },
        ],
      });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="monthly_report_${doc.kabupaten}_${doc.bulanTahun}.xlsx"`
      );
      res.send(excelBuffer);
      return;
    } catch (regenerateError) {
      console.error("Failed to regenerate report:", regenerateError);
      res
        .status(500)
        .json({ message: "Failed to generate report file." });
      return;
    }
  } catch (e) {
    console.error("downloadElderlyMonthlyReport error:", e);
    res.status(500).json({ message: "Server error." });
  }
};
