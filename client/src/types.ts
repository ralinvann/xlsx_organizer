export type UserRole = "superadmin" | "admin" | "officer";

export type ElderlyMonthlyReport = {
  _id: string;
  kabupaten: string;
  puskesmas: string;
  bulanTahun: string;
  metaPairs: { key: string; value: string }[];
  headerKeys: string[];
  headerLabels: string[];
  headerOrder: string[];
  rowData: any[];
  fileName?: string;
  sourceSheetName?: string;
  status?: "draft" | "imported";
  createdAt?: string;
  updatedAt?: string;
};
