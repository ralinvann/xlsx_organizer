// controllers/elderlyMonthlyReportController.ts
import { Request, Response } from "express";
import { ElderlyMonthlyReport } from "../models/ElderlyMonthlyReport";

type IndividualRecord = Record<string, any>;

const YES_VALUES = new Set(["yes", "ya", "v", "✓", "x", "1", "true"]);

function findValue(record: IndividualRecord, predicates: Array<(key: string) => boolean>): any {
  for (const key of Object.keys(record)) {
    const normalizedKey = key.trim().toLowerCase();
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
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue >= 0 ? Math.floor(numericValue) : null;
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
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      birthDate = parsed;
    }
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

      for (const record of rows) {
        const nikValue = findValue(record, [(key) => key === "nik"]);
        const nik = String(nikValue ?? "").trim();
        if (!nik) continue;

        const ageValue = findValue(record, [
          (key) => key === "age",
          (key) => key === "umur",
        ]);
        let age = parseAge(ageValue);

        if (age === null) {
          const birthDateValue = findValue(record, [
            (key) => key === "birthdate",
            (key) => key === "tanggallahir",
            (key) => key.includes("tanggal") && key.includes("lahir"),
          ]);
          age = parseBirthDateToAge(birthDateValue);
        }

        if (age === null) continue;

        const genderValue = findValue(record, [
          (key) => key === "jk",
          (key) => key === "gender",
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