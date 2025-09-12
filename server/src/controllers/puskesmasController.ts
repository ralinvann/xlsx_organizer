// controllers/puskesmasController.ts

import { Request, Response, NextFunction } from 'express';
import { Puskesmas } from '../models/puskesmasModel';
import * as XLSX from 'xlsx';
import multer from 'multer';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });
export const excelUpload = upload.single('file');

// Helper: safely read a cell
function getCell(sheet: XLSX.WorkSheet, cell: string): string {
  return sheet[cell]?.v?.toString()?.trim() || '';
}

// POST /api/puskesmas/upload
export const uploadPuskesmasExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet, { range: 6 }); // Skip header rows

    // Extract metadata
    const kabupaten = getCell(sheet, 'C2') || 'Unknown';
    const puskesmasName = getCell(sheet, 'C3') || 'Unknown';
    const bulanTahun = getCell(sheet, 'C4') || '';
    const [monthStr, yearStr] = bulanTahun.split('/').map(s => parseInt(s.trim()) || 0);
    const month = monthStr || new Date().getMonth() + 1;
    const year = yearStr || new Date().getFullYear();

    // Services mapping
    const usia60Fields = ['SKRINING', 'PENGOBATAN', 'PENYULUHAN', 'PEMBERDAYAAN'];
    const kemandirianFields = ['A', 'B', 'C'];
    const usia70Fields = ['SKRINING_70', 'PENGOBATAN_70', 'PENYULUHAN_70', 'PEMBERDAYAAN_70'];

    const categories = [
      ...usia60Fields.map(f => `Usia > 60 tahun - ${f}`),
      ...kemandirianFields.map(f => `Tingkat Kemandirian ${f}`),
      ...usia70Fields.map(f => `Usia > 70 tahun - ${f.replace('_70', '')}`),
    ];

    // Initialize counters
    const counters: Record<string, { lakiLaki: number; perempuan: number; total: number }> = {};
    categories.forEach(cat => {
      counters[cat] = { lakiLaki: 0, perempuan: 0, total: 0 };
    });

    // Process rows
    rows.forEach((row: any) => {
      const jk = (row['JK'] || '').toString().toLowerCase();
      const isL = jk.startsWith('l'); // flexible for "L", "laki", etc.
      const isP = jk.startsWith('p');

      const genderField = isL ? 'lakiLaki' : isP ? 'perempuan' : null;

      // Define mapping from row headers to categories
      const mapping: Record<string, string> = {
        'SKRINING': 'Usia > 60 tahun - SKRINING',
        'PENGOBATAN': 'Usia > 60 tahun - PENGOBATAN',
        'PENYULUHAN': 'Usia > 60 tahun - PENYULUHAN',
        'PEMBERDAYAAN': 'Usia > 60 tahun - PEMBERDAYAAN',
        'A': 'Tingkat Kemandirian A',
        'B': 'Tingkat Kemandirian B',
        'C': 'Tingkat Kemandirian C',
        'SKRINING_70': 'Usia > 70 tahun - SKRINING',
        'PENGOBATAN_70': 'Usia > 70 tahun - PENGOBATAN',
        'PENYULUHAN_70': 'Usia > 70 tahun - PENYULUHAN',
        'PEMBERDAYAAN_70': 'Usia > 70 tahun - PEMBERDAYAAN',
      };

      Object.keys(mapping).forEach(field => {
        if (row[field] !== undefined && row[field] !== '') {
          const cat = mapping[field];
          if (genderField) counters[cat][genderField]++;
          counters[cat].total++;
        }
      });
    });

    // Build sasaran[]
    const sasaran = Object.entries(counters).map(([kategori, populasi]) => ({
      kategori,
      populasi,
    }));

    const desaList = [
      {
        desa: '-',
        sasaran,
        totalSasaran: sasaran.reduce((sum, s) => sum + s.populasi.total, 0),
      }
    ];

    const newDoc = new Puskesmas({
      name: puskesmasName,
      kabupaten,
      month,
      year,
      desaList
    });

    const saved = await newDoc.save();

    fs.unlinkSync(req.file.path); // cleanup

    res.status(201).json({ message: 'Upload success', data: saved });
  } catch (err) {
    next(err);
  }
};


// GET /api/puskesmas - Get all entries
export const getAllPuskesmas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await Puskesmas.find();
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// GET /api/puskesmas/:id - Get by ID
export const getPuskesmasById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await Puskesmas.findById(req.params.id);
    if (!data) {
      res.status(404).json({ message: 'Puskesmas not found' });
      return;
    }
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

// PUT /api/puskesmas/:id - Edit Puskesmas
export const updatePuskesmas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, kabupaten, desaList } = req.body;

    // If desaList is included, recalculate totalSasaran
    const enrichedDesaList = Array.isArray(desaList)
      ? desaList.map((desa: any) => {
          const total = desa.sasaran?.reduce((sum: number, s: any) => {
            return sum + (s?.populasi?.total || 0);
          }, 0) || 0;

          return { ...desa, totalSasaran: total };
        })
      : undefined;

    const updated = await Puskesmas.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(kabupaten && { kabupaten }),
        ...(enrichedDesaList && { desaList: enrichedDesaList })
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'Puskesmas not found' });
      return;
    }

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};
