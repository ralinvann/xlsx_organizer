// controllers/puskesmasController.ts

import { Request, Response, NextFunction } from 'express';
import { Puskesmas } from '../models/puskesmasModel';

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
