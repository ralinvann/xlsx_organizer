// controllers/elderlyMonthlyReportController.ts
import { Request, Response } from "express";
import { ElderlyMonthlyReport } from "../models/ElderlyMonthlyReport";
import { generateMonthlyReportExcel } from "../utils/generateMonthlyReportExcel";

type IndividualRecord = Record<string, any>;

const YES_VALUES = new Set(["yes", "ya", "v", "✓", "x", "1", "true"]);

function normalizeLookupKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findValue(record: IndividualRecord, predicates: Array<(key: string) => boolean>): any {
  for (const key of Object.keys(record)) {
    const normalizedKey = normalizeLookupKey(key);
    if (predicates.some((predicate) => predicate(normalizedKey))) {
      return record[key];
    }
  }
  return undefined;
}

function parseBooleanFlag(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  return YES_VALUES.has(normalized);
}

function parseAge(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const normalized = trimmed.replace(/,/g, ".");
    const directNumeric = Number(normalized);
    if (Number.isFinite(directNumeric)) {
      return directNumeric >= 0 ? Math.floor(directNumeric) : null;
    }

    const extracted = normalized.match(/\d+/);
    if (extracted) {
      const parsed = Number(extracted[0]);
      return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
    }

    return null;
  }

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue >= 0 ? Math.floor(numericValue) : null;
  }
  return null;
}

function parseDateString(value: string): Date | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const ddmmyyyy = normalized.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const yyyymmdd = normalized.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
  if (yyyymmdd) {
    const year = Number(yyyymmdd[1]);
    const month = Number(yyyymmdd[2]);
    const day = Number(yyyymmdd[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const nativeParsed = new Date(normalized);
  if (!Number.isNaN(nativeParsed.getTime())) {
    return nativeParsed;
  }

  return null;
}

function parseBirthDateToAge(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;

  let birthDate: Date | null = null;

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = new Date(1899, 11, 30);
    birthDate = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  } else if (typeof value === "string") {
    birthDate = parseDateString(value);
  }

  if (!birthDate || Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function normalizeGender(value: any): "L" | "P" | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "L" || normalized === "LAKI-LAKI" || normalized.startsWith("L")) return "L";
  if (normalized === "P" || normalized === "PEREMPUAN" || normalized.startsWith("P")) return "P";
  return null;
}

function normalizeIndependenceLevel(record: IndividualRecord): "A" | "B" | "C" | null {
  const levelValue = findValue(record, [
    (key) => key === "independencelevel",
    (key) => key === "tingkatkemandirian",
    (key) => key.includes("independence") && key.includes("level"),
    (key) => key.includes("tingkat") && key.includes("kemandirian"),
  ]);

  if (levelValue !== undefined && levelValue !== null && String(levelValue).trim() !== "") {
    const normalizedLevel = String(levelValue).trim().toUpperCase();
    if (["A", "B", "C"].includes(normalizedLevel)) {
      return normalizedLevel as "A" | "B" | "C";
    }
  }

  const levelAValue = findValue(record, [(key) => key === "a"]);
  const levelBValue = findValue(record, [(key) => key === "b"]);
  const levelCValue = findValue(record, [(key) => key === "c"]);

  if (parseBooleanFlag(levelAValue)) return "A";
  if (parseBooleanFlag(levelBValue)) return "B";
  if (parseBooleanFlag(levelCValue)) return "C";

  return null;
}

function extractRows(doc: any): IndividualRecord[] {
  const rows: IndividualRecord[] = [];

  if (Array.isArray(doc?.rowData)) {
    for (const row of doc.rowData) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        rows.push(row as IndividualRecord);
      }
    }
  }

  if (Array.isArray(doc?.worksheets)) {
    for (const worksheet of doc.worksheets) {
      if (!Array.isArray(worksheet?.rowData)) continue;
      for (const row of worksheet.rowData) {
        if (row && typeof row === "object" && !Array.isArray(row)) {
          rows.push(row as IndividualRecord);
        }
      }
    }
  }

  return rows;
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

export const createElderlyMonthlyReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const worksheetsInput = Array.isArray(req.body?.worksheets)
      ? req.body.worksheets
      : null;

    if (worksheetsInput && worksheetsInput.length > 0) {
      const topKabupaten = String(req.body?.kabupaten ?? "").trim();
      const topBulanTahun = String(req.body?.bulanTahun ?? "").trim();

      const normalizedWorksheets = worksheetsInput
        .map((ws: any, index: number) => {
          const headerKeys = Array.isArray(ws?.headerKeys)
            ? ws.headerKeys
            : Array.isArray(ws?.headerOrder)
            ? ws.headerOrder
            : [];
          const headerOrder = Array.isArray(ws?.headerOrder)
            ? ws.headerOrder
            : headerKeys;
          const headerLabels = Array.isArray(ws?.headerLabels)
            ? ws.headerLabels
            : headerKeys.map((k: string) => String(k).toUpperCase());
          const rowData = Array.isArray(ws?.rowData) ? ws.rowData : [];

          return {
            worksheetName: String(ws?.worksheetName ?? `Sheet${index + 1}`).trim() || `Sheet${index + 1}`,
            puskesmas: String(ws?.puskesmas ?? req.body?.puskesmas ?? "-").trim() || "-",
            kabupaten: String(ws?.kabupaten ?? topKabupaten).trim(),
            bulanTahun: String(ws?.bulanTahun ?? topBulanTahun).trim(),
            metaPairs: Array.isArray(ws?.metaPairs) ? ws.metaPairs : [],
            headerKeys,
            headerLabels,
            headerOrder,
            rowData,
            sourceSheetName: ws?.sourceSheetName,
            headerBlock: ws?.headerBlock,
          };
        })
        .filter((ws: any) => ws.headerKeys.length > 0 && ws.rowData.length > 0);

      if (normalizedWorksheets.length === 0) {
        res.status(400).json({ message: "worksheets tidak valid atau kosong." });
        return;
      }

      const docKabupaten =
        topKabupaten || String(normalizedWorksheets[0]?.kabupaten ?? "").trim();
      const docBulanTahun =
        topBulanTahun || String(normalizedWorksheets[0]?.bulanTahun ?? "").trim();

      if (!isNonEmptyString(docKabupaten) || !isNonEmptyString(docBulanTahun)) {
        res
          .status(400)
          .json({ message: "kabupaten dan bulanTahun wajib pada payload worksheets." });
        return;
      }

      const firstWs = normalizedWorksheets[0];

      const doc = await ElderlyMonthlyReport.create({
        kabupaten: docKabupaten,
        bulanTahun: docBulanTahun,
        worksheets: normalizedWorksheets,
        puskesmas: firstWs.puskesmas,
        metaPairs: firstWs.metaPairs,
        headerKeys: firstWs.headerKeys,
        headerLabels: firstWs.headerLabels,
        headerOrder: firstWs.headerOrder,
        rowData: firstWs.rowData,
        fileName: req.body?.fileName,
        sourceSheetName: firstWs.sourceSheetName,
        status: "imported",
      });

      res.status(201).json({ message: "Saved", reportId: doc._id, report: doc });
      return;
    }

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

    if (
      !isNonEmptyString(kabupaten) ||
      !isNonEmptyString(puskesmas) ||
      !isNonEmptyString(bulanTahun)
    ) {
      res
        .status(400)
        .json({ message: "kabupaten, puskesmas, bulanTahun wajib." });
      return;
    }

    if (!Array.isArray(headerKeys) || headerKeys.length === 0) {
      res
        .status(400)
        .json({ message: "headerKeys wajib dan tidak boleh kosong." });
      return;
    }

    if (!Array.isArray(rowData) || rowData.length === 0) {
      res
        .status(400)
        .json({ message: "rowData kosong. Tidak ada data untuk disimpan." });
      return;
    }

    const doc = await ElderlyMonthlyReport.create({
      kabupaten: kabupaten.trim(),
      bulanTahun: bulanTahun.trim(),
      worksheets: [
        {
          worksheetName: sourceSheetName?.trim() || "Sheet1",
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
        },
      ],
      puskesmas: puskesmas.trim(),
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
    const doc: any = await ElderlyMonthlyReport.findById(id).lean();

    if (!doc) {
      res.status(404).json({ message: "Not found." });
      return;
    }

    const worksheetsSource =
      Array.isArray(doc.worksheets) && doc.worksheets.length > 0
        ? doc.worksheets
        : [
            {
              worksheetName: doc.sourceSheetName || "Sheet1",
              puskesmas: doc.puskesmas || "-",
              kabupaten: doc.kabupaten,
              bulanTahun: doc.bulanTahun,
              headerKeys: Array.isArray(doc.headerKeys) ? doc.headerKeys : [],
              headerLabels: Array.isArray(doc.headerLabels) ? doc.headerLabels : [],
              rowData: Array.isArray(doc.rowData) ? doc.rowData : [],
            },
          ];

    const normalizedWorksheets = worksheetsSource
      .map((ws: any, index: number) => {
        const headerKeys = Array.isArray(ws?.headerKeys) ? ws.headerKeys : [];
        const headerLabels = Array.isArray(ws?.headerLabels)
          ? ws.headerLabels
          : headerKeys.map((k: string) => String(k).toUpperCase());
        const rowData = Array.isArray(ws?.rowData) ? ws.rowData : [];

        return {
          worksheetName: String(ws?.worksheetName ?? `Sheet${index + 1}`).trim() || `Sheet${index + 1}`,
          puskesmas: String(ws?.puskesmas ?? doc.puskesmas ?? "-").trim() || "-",
          kabupaten: String(ws?.kabupaten ?? doc.kabupaten ?? "").trim(),
          bulanTahun: String(ws?.bulanTahun ?? doc.bulanTahun ?? "").trim(),
          headerKeys,
          headerLabels,
          rowData,
        };
      })
      .filter((ws: any) => ws.headerKeys.length > 0 && ws.rowData.length > 0);

    if (normalizedWorksheets.length === 0) {
      res.status(400).json({ message: "Report data is incomplete for download." });
      return;
    }

    const payload = {
      kabupaten: String(doc.kabupaten || normalizedWorksheets[0].kabupaten || "").trim(),
      bulanTahun: String(doc.bulanTahun || normalizedWorksheets[0].bulanTahun || "").trim(),
      worksheets: normalizedWorksheets,
    };

    const buffer = await generateMonthlyReportExcel(payload);
    const safeBulanTahun = payload.bulanTahun.replace(/\s+/g, "_") || "Report";
    const filename = `Laporan_Bulanan_${safeBulanTahun}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    console.error("downloadElderlyMonthlyReport error:", e);
    res.status(500).json({ message: "Server error downloading report." });
  }
};

/**
 * GET /api/lwreports/dashboard
 * Dashboard summary for client
 */
export const getDashboardData = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const docs = await ElderlyMonthlyReport.find(
      {},
      { rowData: 1, "worksheets.rowData": 1 }
    ).lean();

    let totalRowsScanned = 0;
    let validRowsScanned = 0;

    const totalPraLansiaSet = new Set<string>();
    const totalLansiaSet = new Set<string>();
    const totalLansiaRistiSet = new Set<string>();
    const screenedLansiaSet = new Set<string>();
    const empowermentSet = new Set<string>();

    const independenceASet = new Set<string>();
    const independenceBSet = new Set<string>();
    const independenceCSet = new Set<string>();

    const maleSet = new Set<string>();
    const femaleSet = new Set<string>();

    for (const doc of docs) {
      const rows = extractRows(doc);
      totalRowsScanned += rows.length;

      for (const record of rows) {
        const nikValue = findValue(record, [
          (key) => key === "nik",
          (key) => key.includes("nik"),
          (key) => key.includes("noktp"),
          (key) => key.includes("ktp"),
        ]);
        const nik = String(nikValue ?? "").trim();
        if (!nik) continue;

        const ageValue = findValue(record, [
          (key) => key === "age",
          (key) => key === "umur",
          (key) => key === "usia",
          (key) => key.includes("umur"),
          (key) => key.includes("usia"),
        ]);
        let age = parseAge(ageValue);

        if (age === null) {
          const birthDateValue = findValue(record, [
            (key) => key === "birthdate",
            (key) => key === "tanggallahir",
            (key) => key === "tgllahir",
            (key) => key.includes("tanggal") && key.includes("lahir"),
            (key) => key.includes("lahir"),
            (key) => key.includes("birth") && key.includes("date"),
          ]);
          age = parseBirthDateToAge(birthDateValue);
        }

        if (age === null) continue;
        validRowsScanned += 1;

        const genderValue = findValue(record, [
          (key) => key === "jk",
          (key) => key === "gender",
          (key) => key === "jeniskelamin",
          (key) => key.includes("jenis") && key.includes("kelamin"),
        ]);
        const gender = normalizeGender(genderValue);
        if (gender === "L") maleSet.add(nik);
        if (gender === "P") femaleSet.add(nik);

        if (age >= 45 && age <= 59) {
          totalPraLansiaSet.add(nik);
        }

        if (age >= 60) {
          totalLansiaSet.add(nik);

          const screeningValue = findValue(record, [
            (key) => key === "screening",
            (key) => key.includes("skrining"),
          ]);
          if (parseBooleanFlag(screeningValue)) {
            screenedLansiaSet.add(nik);
          }

          const empowermentValue = findValue(record, [
            (key) => key === "empowerment",
            (key) => key.includes("pemberdayaan"),
          ]);
          if (parseBooleanFlag(empowermentValue)) {
            empowermentSet.add(nik);
          }

          const independenceLevel = normalizeIndependenceLevel(record);
          if (independenceLevel === "A") independenceASet.add(nik);
          if (independenceLevel === "B") independenceBSet.add(nik);
          if (independenceLevel === "C") independenceCSet.add(nik);
        }

        if (age >= 70) {
          totalLansiaRistiSet.add(nik);
        }
      }
    }

    res.json({
      totalReports: docs.length,
      totalRowsScanned,
      validRowsScanned,
      totalPraLansia: totalPraLansiaSet.size,
      totalLansia: totalLansiaSet.size,
      totalLansiaRisti: totalLansiaRistiSet.size,
      screenedLansia: screenedLansiaSet.size,
      empowermentCount: empowermentSet.size,
      independenceLevels: {
        A: independenceASet.size,
        B: independenceBSet.size,
        C: independenceCSet.size,
      },
      genderBreakdown: {
        male: maleSet.size,
        female: femaleSet.size,
      },
    });
  } catch (e) {
    console.error("getDashboardData error:", e);
    res.status(500).json({ message: "Server error loading dashboard." });
  }
};

export const ElderlyMonthlyReportController = {
  getDashboardData,
};