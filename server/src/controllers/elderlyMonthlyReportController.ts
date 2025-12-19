import { Request, Response } from "express";
import { ElderlyMonthlyReport } from "../models/ElderlyMonthlyReport";

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function toStr(v: any) {
  return String(v ?? "").trim();
}

function parseSysFromBP(v: any): number {
  const s = toStr(v);
  if (!s) return NaN;
  const part = s.includes("/") ? s.split("/")[0] : s;
  const n = parseInt(part.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : NaN;
}

function parseSugar(v: any): number {
  const s = toStr(v);
  if (!s) return NaN;
  const n = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : NaN;
}

function findKeyByAliases(obj: any, aliases: string[]): string | null {
  if (!obj) return null;
  const keys = Object.keys(obj);
  const aliasSet = new Set(aliases.map((a) => a.toLowerCase()));
  for (const k of keys) {
    const lower = k.toLowerCase();
    if (aliasSet.has(lower)) return k;
  }
  return null;
}

export const createElderlyMonthlyReport = async (req: Request, res: Response): Promise<void> => {
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

export const getElderlyMonthlyReports = async (_req: Request, res: Response): Promise<void> => {
  try {
    const docs = await ElderlyMonthlyReport.find().sort({ createdAt: -1 }).limit(50);
    res.json({ items: docs });
  } catch (e) {
    console.error("getElderlyMonthlyReports error:", e);
    res.status(500).json({ message: "Server error." });
  }
};

export const getElderlyMonthlyReportById = async (req: Request, res: Response): Promise<void> => {
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

export const getElderlyMonthlyReportSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const mode = String(req.query.mode ?? "full"); // "guest" | "full"

    // latest report
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

    // previous report (for improvement calc)
    const prev = await ElderlyMonthlyReport.findOne({ _id: { $ne: latest._id } }).sort({ createdAt: -1 });

    const latestRows = Array.isArray((latest as any).rowData) ? (latest as any).rowData : [];
    const prevRows = prev && Array.isArray((prev as any).rowData) ? (prev as any).rowData : [];

    // Find probable keys in row objects
    const sample = latestRows[0] || {};
    const nameKey = findKeyByAliases(sample, ["nama", "nama_lengkap", "nama lengkap", "name"]);
    const bpKey = findKeyByAliases(sample, ["tekanandarah", "tekanan_darah", "td", "blood_pressure"]);
    const sugarKey = findKeyByAliases(sample, ["guladarah", "gula_darah", "gds", "blood_sugar"]);

    // Optional "intervention" key (if your sheet has it)
    const interventionKey = findKeyByAliases(sample, ["intervensi", "tindakan", "tindakan_medis", "aksi", "action"]);

    const totalMeasured = latestRows.length;

    const urgentCount = latestRows.reduce((acc: number, r: any) => {
      const sys = bpKey ? parseSysFromBP(r[bpKey]) : NaN;
      const sugar = sugarKey ? parseSugar(r[sugarKey]) : NaN;
      const urgent = (!Number.isNaN(sys) && sys >= 140) || (!Number.isNaN(sugar) && sugar >= 180);
      return acc + (urgent ? 1 : 0);
    }, 0);

    // interventions: if you have a column, count rows where it’s non-empty; else fallback to urgentCount
    const interventions = interventionKey
      ? latestRows.reduce((acc: number, r: any) => acc + (toStr(r[interventionKey]) ? 1 : 0), 0)
      : urgentCount;

    // health improvement = decrease in urgent rate vs previous month (positive = better)
    let healthImprovementPct: number | null = null;
    if (prevRows.length > 0) {
      const prevUrgent = prevRows.reduce((acc: number, r: any) => {
        const sys = bpKey ? parseSysFromBP(r[bpKey]) : NaN;
        const sugar = sugarKey ? parseSugar(r[sugarKey]) : NaN;
        const urgent = (!Number.isNaN(sys) && sys >= 140) || (!Number.isNaN(sugar) && sugar >= 180);
        return acc + (urgent ? 1 : 0);
      }, 0);

      const prevRate = prevUrgent / prevRows.length;
      const curRate = urgentCount / latestRows.length;

      // improvement pct: (prevRate - curRate) * 100
      const imp = (prevRate - curRate) * 100;
      healthImprovementPct = Number.isFinite(imp) ? Math.round(imp) : null;
    }

    // Recent activities: derive from latest rows (top 3)
    const recentActivities = latestRows.slice(0, 3).map((r: any, idx: number) => {
      const rawName = nameKey ? toStr(r[nameKey]) : `Pasien ${idx + 1}`;
      const patient =
        mode === "guest"
          ? rawName
              ? rawName.split(" ").map((p: string, i: number) => (i === 0 ? `${p[0] ?? ""}***` : "")).join(" ").trim() || "P***"
              : "P***"
          : rawName || `Pasien ${idx + 1}`;

      const sys = bpKey ? parseSysFromBP(r[bpKey]) : NaN;
      const sugar = sugarKey ? parseSugar(r[sugarKey]) : NaN;

      const urgent = (!Number.isNaN(sys) && sys >= 140) || (!Number.isNaN(sugar) && sugar >= 180);

      const status = urgent ? "Perlu tindak lanjut" : "Normal";
      const action =
        interventionKey && toStr(r[interventionKey])
          ? toStr(r[interventionKey])
          : bpKey
          ? "Pemeriksaan tekanan darah"
          : "Pemeriksaan kesehatan";

      return {
        patient,
        action,
        status,
        time: idx === 0 ? "Baru saja" : idx === 1 ? "1 jam yang lalu" : "2 jam yang lalu",
        location: (latest as any).puskesmas || "Puskesmas",
        restricted: mode === "guest",
      };
    });

    res.json({
      summary: {
        totalMeasuredThisMonth: totalMeasured,
        interventionsThisMonth: interventions,
        urgentCasesThisMonth: urgentCount,
        healthImprovementPct,
        latestBulanTahun: (latest as any).bulanTahun ?? null,
      },
      recentActivities,
    });
  } catch (e) {
    console.error("getElderlyMonthlyReportSummary error:", e);
    res.status(500).json({ message: "Server error." });
  }
};
