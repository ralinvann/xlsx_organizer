// models/puskesmasModel.ts
import mongoose, { Schema, Document } from 'mongoose';

interface Populasi {
  lakiLaki: number;
  perempuan: number;
  total: number;
}

interface Sasaran {
  kategori: string;
  populasi: Populasi;
}

interface DesaEntry {
  desa: string;
  sasaran: Sasaran[];
}

export interface IPuskesmas extends Document {
  name: string;
  kabupaten: string;
  desaList: DesaEntry[];
}

const PopulasiSchema: Schema = new Schema({
  lakiLaki: { type: Number, required: true },
  perempuan: { type: Number, required: true },
  total: { type: Number, required: true }
});

const SasaranSchema: Schema = new Schema({
  kategori: { type: String, required: true },
  populasi: { type: PopulasiSchema, required: true }
});

const DesaEntrySchema: Schema = new Schema({
  desa: { type: String, required: true },
  sasaran: { type: [SasaranSchema], default: [] },
  totalSasaran: { type: Number, default: 0 }
});

const PuskesmasSchema: Schema = new Schema({
  name: { type: String, required: true },
  kabupaten: { type: String, required: true },
  desaList: { type: [DesaEntrySchema], default: [] }
});

export const Puskesmas = mongoose.model<IPuskesmas>('Puskesmas', PuskesmasSchema);
