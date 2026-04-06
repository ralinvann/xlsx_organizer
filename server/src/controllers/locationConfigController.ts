import { Request, Response } from "express";
import { LocationConfig } from "../models/LocationConfig";

function normalizeKabupaten(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export const listLocationConfigs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await LocationConfig.find().sort({ kabupaten: 1 }).lean();
    res.status(200).json({ items });
  } catch (err) {
    console.error("listLocationConfigs error:", err);
    res.status(500).json({ message: "Gagal memuat konfigurasi lokasi." });
  }
};

export const upsertLocationConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const kabupaten = normalizeKabupaten(String(req.params.kabupaten ?? ""));
    const desaListInput = Array.isArray(req.body?.desaList) ? req.body.desaList : [];

    if (!kabupaten) {
      res.status(400).json({ message: "kabupaten wajib diisi." });
      return;
    }

    const desaList = Array.from(
      new Set(
        desaListInput
          .map((d: any) => String(d ?? "").trim())
          .filter((d: string) => d.length > 0)
      )
    );

    const updatedBy = req.user?.id;

    const item = await LocationConfig.findOneAndUpdate(
      { kabupaten },
      {
        $set: {
          kabupaten,
          desaList,
          updatedBy: updatedBy || undefined,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ message: "Konfigurasi lokasi disimpan.", item });
  } catch (err) {
    console.error("upsertLocationConfig error:", err);
    res.status(500).json({ message: "Gagal menyimpan konfigurasi lokasi." });
  }
};
