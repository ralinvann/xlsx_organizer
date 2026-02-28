import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { CheckCircle, Edit3, Save, X } from "lucide-react";
import { api } from "../lib/api";

type UploadPayload = {
  kabupaten?: string;
  puskesmas?: string;
  bulanTahun?: string;
  metaPairs?: { key: string; value: string }[];

  rows: any[];
  headerKeys: string[];
  headerLabels: string[];
  headerOrder: string[];

  fileName?: string;
  sourceSheetName?: string;
  headerBlock?: {
    start: number;
    end: number;
    rows: any[][];
    merges: any[];
  };
};

type WorksheetData = UploadPayload & {
  worksheetName: string;
};

type MultiWorksheetPayload = {
  fileName?: string;
  worksheets: WorksheetData[];
  activeWorksheetIndex?: number;
};

type PreviewEditPageProps = {
  initialData?: any[] | UploadPayload | null;
  onDone?: () => void;
  onCancel?: () => void;
};

function excelSerialToDate(serial: number): Date {
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  return date;
}

function dateToExcelSerial(date: Date): number {
  const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((date.getTime() - excelEpoch.getTime()) / millisecondsPerDay);
}

function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateDDMMYYYY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);
  
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  
  return date;
}

function isDateField(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.includes("tanggal") || lower.includes("tgl") || lower.includes("date");
}

// Helper: Format gender field display
function formatGenderDisplay(value: any): string {
  if (!value) return "-";
  const str = String(value).trim().toLowerCase();
  const hasL = str.includes("l");
  const hasP = str.includes("p");
  
  if (hasL && !hasP) return "Male (Laki-laki)";
  if (hasP && !hasL) return "Female (Perempuan)";
  if (hasL && hasP) return "Ambiguous (contains both l & p)";
  return "Invalid";
}

// Helper: Remove consecutive completely empty columns from the right edge
function removeTrailingEmptyColumns(payload: UploadPayload): UploadPayload {
  if (!payload.rows || payload.rows.length === 0) {
    return payload;
  }

  const headerKeys = payload.headerOrder ?? payload.headerKeys ?? [];
  if (headerKeys.length === 0) {
    return payload;
  }

  let lastNonEmptyColIndex = -1;

  for (let colIdx = headerKeys.length - 1; colIdx >= 0; colIdx--) {
    const colKey = headerKeys[colIdx];
    const hasData = payload.rows.some((row) => {
      const value = row[colKey];
      return value !== null && value !== undefined && String(value).trim() !== "";
    });

    if (hasData) {
      lastNonEmptyColIndex = colIdx;
      break;
    }
  }

  if (lastNonEmptyColIndex === -1 || lastNonEmptyColIndex === headerKeys.length - 1) {
    return payload;
  }

  const newHeaderKeys = headerKeys.slice(0, lastNonEmptyColIndex + 1);
  const newHeaderLabels = payload.headerLabels?.slice(0, lastNonEmptyColIndex + 1) ?? newHeaderKeys.map((k) => String(k).toUpperCase());
  const newHeaderOrder = newHeaderKeys;

  const newRows = payload.rows.map((row) => {
    const newRow: Record<string, any> = { id: row.id };
    newHeaderKeys.forEach((key) => {
      newRow[key] = row[key];
    });
    return newRow;
  });

  return {
    ...payload,
    rows: newRows,
    headerKeys: newHeaderKeys,
    headerLabels: newHeaderLabels,
    headerOrder: newHeaderOrder,
  };
}

function isMultiWorksheet(data: any): data is MultiWorksheetPayload {
  return (
    data &&
    typeof data === "object" &&
    Array.isArray(data.worksheets) &&
    data.worksheets.length > 0 &&
    typeof data.worksheets[0] === "object" &&
    "worksheetName" in data.worksheets[0]
  );
}

function getWorksheetPayload(multiPayload: MultiWorksheetPayload, sheetIndex: number): UploadPayload | null {
  if (sheetIndex < 0 || sheetIndex >= multiPayload.worksheets.length) {
    return null;
  }

  const worksheet = multiPayload.worksheets[sheetIndex];
  return removeTrailingEmptyColumns(worksheet);
}

export function PreviewEditPage({
  initialData = null,
  onDone,
  onCancel,
}: PreviewEditPageProps) {
  const [payload, setPayload] = useState<UploadPayload | null>(null);
  const [multiWorksheetPayload, setMultiWorksheetPayload] = useState<MultiWorksheetPayload | null>(null);
  const [activeWorksheetIndex, setActiveWorksheetIndex] = useState(0);

  const [isEditing, setIsEditing] = useState(false);
  const [editedRows, setEditedRows] = useState<Record<string, Record<string, any>>>({});

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function payloadFromArray(arr: any[]): UploadPayload {
    const rows = (arr || []).map((r: any, i: number) => {
      const obj = { ...r };
      if (obj.id === undefined || obj.id === null) obj.id = `row_${Date.now()}_${i + 1}`;
      Object.keys(obj).forEach((k) => {
        if (typeof obj[k] === "string") obj[k] = obj[k].trim();
      });
      return obj;
    });
    const headerKeys = rows.length > 0 ? Object.keys(rows[0]).filter((k) => k !== "id") : [];
    const headerLabels = headerKeys.map((k) => String(k).toUpperCase());
    const headerOrder = [...headerKeys];
    return { rows, headerKeys, headerLabels, headerOrder };
  }

  function normalizeStored(payloadOrArray: any): UploadPayload | MultiWorksheetPayload | null {
    if (!payloadOrArray) return null;
    if (Array.isArray(payloadOrArray)) return payloadFromArray(payloadOrArray);

    // Check if it's a multi-worksheet payload
    if (isMultiWorksheet(payloadOrArray)) {
      return payloadOrArray;
    }

    if (payloadOrArray.rows && (payloadOrArray.headerKeys || payloadOrArray.headerOrder)) {
      const rows = (payloadOrArray.rows || []).map((r: any, i: number) => {
        const obj = { ...r };
        if (obj.id === undefined || obj.id === null) obj.id = `row_${Date.now()}_${i + 1}`;
        Object.keys(obj).forEach((k) => {
          if (typeof obj[k] === "string") obj[k] = obj[k].trim();
        });
        return obj;
      });

      const headerKeys = payloadOrArray.headerOrder ?? payloadOrArray.headerKeys ?? [];
      const headerLabels =
        payloadOrArray.headerLabels ?? headerKeys.map((k: string) => String(k).toUpperCase());
      const headerOrder = headerKeys;

      const normalized: UploadPayload = {
        ...payloadOrArray,
        rows,
        headerKeys,
        headerLabels,
        headerOrder,
      };

      // Remove trailing empty columns
      return removeTrailingEmptyColumns(normalized);
    }
    return null;
  }

  useEffect(() => {
    if (initialData && !Array.isArray(initialData)) {
      const normalized = normalizeStored(initialData);
      if (normalized) {
        if (isMultiWorksheet(normalized)) {
          setMultiWorksheetPayload(normalized);
          setActiveWorksheetIndex(normalized.activeWorksheetIndex ?? 0);
          setPayload(removeTrailingEmptyColumns(normalized.worksheets[normalized.activeWorksheetIndex ?? 0]));
        } else {
          setPayload(normalized as UploadPayload);
          setMultiWorksheetPayload(null);
        }
        return;
      }
    }

    if (initialData && Array.isArray(initialData)) {
      setPayload(payloadFromArray(initialData));
      setMultiWorksheetPayload(null);
      return;
    }

    try {
      const s = sessionStorage.getItem("previewData");
      if (s) {
        const parsed = JSON.parse(s);
        const normalized = normalizeStored(parsed);
        if (normalized) {
          if (isMultiWorksheet(normalized)) {
            setMultiWorksheetPayload(normalized);
            setActiveWorksheetIndex(normalized.activeWorksheetIndex ?? 0);
            setPayload(removeTrailingEmptyColumns(normalized.worksheets[normalized.activeWorksheetIndex ?? 0]));
          } else {
            setPayload(normalized as UploadPayload);
            setMultiWorksheetPayload(null);
          }
          return;
        }
        if (Array.isArray(parsed)) {
          setPayload(payloadFromArray(parsed));
          setMultiWorksheetPayload(null);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to read previewData from sessionStorage", e);
    }

    setPayload(null);
    setMultiWorksheetPayload(null);
  }, [initialData]);

  const rows = payload?.rows ?? null;
  const headerKeys = payload?.headerOrder ?? payload?.headerKeys ?? [];
  const headerLabels = payload?.headerLabels ?? headerKeys.map((k) => String(k).toUpperCase());

  const getRowValidationStatus = (row: any): "error" | "valid" => {
    const hasName = row.nama !== undefined ? Boolean(String(row.nama).trim()) : true;
    const hasNik = row.nik !== undefined ? Boolean(String(row.nik).trim()) : true;
    const hasAge =
      row.umur !== undefined ? !(row.umur === null || row.umur === "" || Number.isNaN(Number(row.umur))) : true;
    
    // Check for gender/jk field
    let hasGender = true;
    for (const key of Object.keys(row)) {
      const lower = key.toLowerCase();
      if ((lower === "jk" || lower.includes("jenis") && lower.includes("kelamin")) && 
          (row[key] === null || row[key] === undefined || !String(row[key]).trim())) {
        hasGender = false;
        break;
      }
    }

    if (!(hasName && hasNik && hasAge && hasGender)) {
      return "error";
    }

    return "valid";
  };

  // Helper to check if a specific cell has an error
  const getCellError = (row: any, key: string): string | null => {
    const lowerKey = key.toLowerCase();
    const cellValue = row[key];

    // Check for nama (exact match or contains, but must be a name field)
    if ((lowerKey === "nama" || lowerKey.includes("nama")) && (!cellValue || !String(cellValue).trim())) {
      return "Nama wajib diisi";
    }
    
    // Check for nik (CRITICAL - must not be empty, must be integer, must be unique)
    if ((lowerKey === "nik" || lowerKey.includes("nik"))) {
      // Check if empty
      if (!cellValue || !String(cellValue).trim()) {
        return "❌ NIK wajib diisi (CRITICAL)";
      }
      
      // Check if it's a valid integer
      const nikStr = String(cellValue).trim();
      const nikNum = Number(nikStr);
      
      if (Number.isNaN(nikNum) || !Number.isInteger(nikNum) || nikNum <= 0) {
        return "❌ NIK harus berupa angka bulat positif (INTEGER)";
      }
      
      // Check for uniqueness within this upload batch
      // Use the edited values if they exist, otherwise use original
      const nikCount = rows?.filter((r) => {
        const rnik = editedRows[String(r.id)]?.[key] ?? r[key];
        return rnik && Number(rnik) === nikNum;
      }).length ?? 0;
      
      if (nikCount > 1) {
        return `❌ NIK duplikat (ada ${nikCount} data dengan NIK yang sama)`;
      }
    }
    
    // Check for umur (age - REQUIRED and must be an integer >= 0)
    if ((lowerKey === "umur" || lowerKey.includes("umur"))) {
      if (cellValue === null || cellValue === "") {
        return "❌ Umur wajib diisi (REQUIRED)";
      }
      const numValue = Number(cellValue);
      if (Number.isNaN(numValue) || !Number.isInteger(numValue)) {
        return "❌ Umur harus berupa angka bulat (integer)";
      }
      if (numValue < 0 || numValue > 150) {
        return "❌ Umur tidak valid (harus 0-150)";
      }
    }
    
    // Check for gender/jk (exact match or contains)
    if ((lowerKey === "jk" || (lowerKey.includes("jenis") && lowerKey.includes("kelamin")))) {
      if (!cellValue || !String(cellValue).trim()) {
        return "❌ Jenis Kelamin wajib diisi (required)";
      }
      
      const genderStr = String(cellValue).trim().toLowerCase();
      const hasL = genderStr.includes("l");
      const hasP = genderStr.includes("p");
      
      // Validate gender: must contain 'l' (male) or 'p' (female)
      if (!hasL && !hasP) {
        return `❌ Jenis Kelamin tidak valid - harus 'l' (Laki-laki) atau 'p' (Perempuan). Ditemukan: "${genderStr}"`;
      }
    }
    
    // Check for date fields (must be valid date format)
    if (isDateField(key)) {
      if (cellValue === null || cellValue === "") {
        return null; // Date is optional
      }
      
      // If it's a string, try to parse as DD/MM/YYYY
      if (typeof cellValue === "string") {
        const dateStr = cellValue.trim();
        const parsed = parseDateDDMMYYYY(dateStr);
        if (!parsed) {
          return "❌ Format tanggal tidak valid. Gunakan format DD/MM/YYYY";
        }
      } else {
        // If it's a number, check if it's a valid integer (Excel serial)
        const numValue = Number(cellValue);
        if (Number.isNaN(numValue) || !Number.isInteger(numValue)) {
          return "❌ Format tanggal tidak valid";
        }
        if (numValue < 0 || numValue > 100000) {
          return "❌ Tanggal tidak valid";
        }
      }
    }

    return null;
  };

  const validationResults = useMemo(() => {
    if (!rows) return { total: 0, valid: 0, warning: 0, error: 0 };

    let total = rows.length;
    let valid = 0;
    let errorCount = 0;

    rows.forEach((r) => {
      // Apply edited values to row for validation
      const edits = editedRows[String(r.id)];
      const rowToValidate = edits ? { ...r, ...edits } : r;
      
      const status = getRowValidationStatus(rowToValidate);
      if (status === "error") {
        errorCount += 1;
      } else {
        valid += 1;
      }
    });

    return { total, valid, warning: 0, error: errorCount };
  }, [rows, editedRows]);

  const handleToggleEditMode = () => {
    if (isEditing) {
      // Entering edit mode - initialize editedRows as empty
      setEditedRows({});
    }
    setIsEditing(!isEditing);
  };

  const handleCellChange = (rowId: string | number, key: string, value: any) => {
    setEditedRows((prev) => ({
      ...prev,
      [String(rowId)]: {
        ...(prev[String(rowId)] || {}),
        [key]: value,
      },
    }));
  };

  const handleSaveAllChanges = () => {
    if (!payload) return;

    // Apply all edits to rows, converting dates to Excel serial numbers
    const newRows = payload.rows.map((row) => {
      const edits = editedRows[String(row.id)];
      if (edits) {
        const updatedRow: Record<string, any> = { ...row };
        
        // Process each edited field
        Object.entries(edits).forEach(([key, value]) => {
          if (isDateField(key) && value !== null && value !== "") {
            // Try to parse as DD/MM/YYYY format
            const dateStr = String(value).trim();
            const parsed = parseDateDDMMYYYY(dateStr);
            if (parsed) {
              // Convert to Excel serial number for storage
              updatedRow[key] = dateToExcelSerial(parsed);
            } else {
              // If it doesn't parse, keep it as-is (will fail validation)
              updatedRow[key] = value;
            }
          } else {
            updatedRow[key] = value;
          }
        });
        
        return updatedRow;
      }
      return row;
    });

    const newPayload: UploadPayload = { ...payload, rows: newRows };
    setPayload(newPayload);

    try {
      sessionStorage.setItem("previewData", JSON.stringify(newPayload));
    } catch (e) {
      console.warn("sessionStorage write failed", e);
    }

    setEditedRows({});
    setIsEditing(false);
    setSuccessMsg("Semua perubahan disimpan.");
    setTimeout(() => setSuccessMsg(null), 1600);
  };

  const handleCancelEdits = () => {
    setEditedRows({});
    setIsEditing(false);
  };

  const handleCancelImport = (): void => {
    try {
      sessionStorage.removeItem("previewData");
      // also clear upload-related persisted state so the step indicator can't stay completed
      sessionStorage.removeItem("uploadStep");
      sessionStorage.removeItem("uploadFileName");
    } catch (e) {
      console.warn("sessionStorage remove failed", e);
    }

    // notify other components (e.g. UploadPage) to reset their in-memory state
    try {
      window.dispatchEvent(new CustomEvent("upload-reset", { detail: { timestamp: Date.now() } }));
    } catch (err) {
      console.warn("dispatch upload-reset failed", err);
    }

    if (typeof onCancel === "function") {
      onCancel();
      return;
    }

    setPayload(null);
    setMultiWorksheetPayload(null);
    setSuccessMsg("Import dibatalkan.");
    setTimeout(() => setSuccessMsg(null), 1600);
  };

  const handleSwitchWorksheet = (sheetIndex: number): void => {
    if (!multiWorksheetPayload || sheetIndex < 0 || sheetIndex >= multiWorksheetPayload.worksheets.length) {
      return;
    }

    setActiveWorksheetIndex(sheetIndex);
    setPayload(removeTrailingEmptyColumns(multiWorksheetPayload.worksheets[sheetIndex]));
    setIsEditing(false);
    setEditedRows({});
  };

  const handleConfirmImport = async (): Promise<void> => {
    if (!rows || rows.length === 0) {
      setErrorMsg("Tidak ada data untuk diimpor.");
      return;
    }
    if (validationResults.error > 0) {
      setErrorMsg("Beberapa record memiliki kesalahan wajib. Perbaiki sebelum konfirmasi.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let body: any;

      if (multiWorksheetPayload && multiWorksheetPayload.worksheets.length > 1) {
        // Send all worksheets with month/year information
        body = {
          fileName: multiWorksheetPayload.fileName,
          kabupaten: multiWorksheetPayload.worksheets[0]?.kabupaten ?? "",
          bulanTahun: multiWorksheetPayload.worksheets[0]?.bulanTahun ?? "",
          worksheets: multiWorksheetPayload.worksheets.map((ws) => ({
            worksheetName: ws.worksheetName,
            puskesmas: ws.puskesmas ?? "",
            kabupaten: ws.kabupaten ?? "",
            bulanTahun: ws.bulanTahun ?? "",
            metaPairs: ws.metaPairs ?? [],
            headerKeys: ws.headerKeys ?? ws.headerOrder ?? [],
            headerLabels: ws.headerLabels ?? [],
            headerOrder: ws.headerOrder ?? ws.headerKeys ?? [],
            rowData: ws.rows,
            sourceSheetName: ws.sourceSheetName,
            headerBlock: ws.headerBlock,
          })),
        };
      } else {
        // Send single worksheet
        body = {
          fileName: payload?.fileName,
          kabupaten: payload?.kabupaten ?? "",
          bulanTahun: payload?.bulanTahun ?? "",
          worksheets: [
            {
              worksheetName: payload?.sourceSheetName ?? "Sheet1",
              puskesmas: payload?.puskesmas ?? "",
              kabupaten: payload?.kabupaten ?? "",
              bulanTahun: payload?.bulanTahun ?? "",
              metaPairs: payload?.metaPairs ?? [],
              headerKeys: payload?.headerKeys ?? payload?.headerOrder ?? [],
              headerLabels: payload?.headerLabels ?? [],
              headerOrder: payload?.headerOrder ?? payload?.headerKeys ?? [],
              rowData: rows,
              sourceSheetName: payload?.sourceSheetName,
              headerBlock: payload?.headerBlock,
            },
          ],
        };
      }

      const { data } = await api.post("/elderly-reports", body); // IMPORTANT: no "/api" here
      if (!data?.reportId && !data?.success) throw new Error("Response tidak valid dari server.");

      setSuccessMsg("Data berhasil diimpor ke database dan laporan bulanan telah dibuat.");
      sessionStorage.removeItem("previewData");
      if (typeof onDone === "function") onDone();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "Gagal mengimpor data. Coba lagi.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!rows) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-semibold">Preview and Edit Data</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Tidak ada data preview. Silakan unggah file terlebih dahulu.
          </p>
          <div className="text-sm text-muted-foreground mt-2">
            File: <strong>{payload?.fileName ?? sessionStorage.getItem("uploadFileName") ?? "unknown"}</strong>
          </div>
        </div>
        {errorMsg && <div className="text-red-600">{errorMsg}</div>}
        {successMsg && <div className="text-green-600">{successMsg}</div>}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Preview and Edit Data</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Review dan edit data sebelum menyimpan ke sistem
          </p>

          {/* show meta header */}
          <div className="mt-3 text-sm text-muted-foreground space-y-1">
            <div>File: <strong>{payload?.fileName ?? multiWorksheetPayload?.fileName ?? "-"}</strong></div>
            <div>KABUPATEN: <strong>{payload?.kabupaten ?? "-"}</strong></div>
            <div>PUSKESMAS: <strong>{payload?.puskesmas ?? "-"}</strong></div>
            <div>BULAN/TAHUN: <strong>{payload?.bulanTahun ?? "-"}</strong></div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-6 text-lg"
            onClick={handleToggleEditMode}
          >
            <Edit3 className="w-5 h-5 mr-2" />
            {isEditing ? "Batalkan Perubahan" : "Edit Data"}
          </Button>

          {isEditing && (
            <Button
              size="lg"
              className="h-12 px-6 text-lg"
              onClick={handleSaveAllChanges}
            >
              <Save className="w-5 h-5 mr-2" />
              Simpan Semua Perubahan
            </Button>
          )}

          {!isEditing && (
            <Button
              size="lg"
              className="h-12 px-6 text-lg"
              onClick={() => {
                try {
                  const dataToSave = multiWorksheetPayload
                    ? { ...multiWorksheetPayload, activeWorksheetIndex }
                    : payload;
                  if (dataToSave) sessionStorage.setItem("previewData", JSON.stringify(dataToSave));
                  setSuccessMsg("Perubahan disimpan sementara.");
                  setTimeout(() => setSuccessMsg(null), 1600);
                } catch (e) {
                  console.warn("sessionStorage write failed", e);
                  setErrorMsg("Gagal menyimpan sementara perubahan.");
                }
              }}
            >
              <Save className="w-5 h-5 mr-2" />
              Simpan Sementara
            </Button>
          )}
        </div>
      </div>

      {/* Worksheet Tabs - Show only if multiple worksheets exist */}
      {multiWorksheetPayload && multiWorksheetPayload.worksheets.length > 1 && (
        <Card className="shadow-md gap-1">
          <CardHeader>
            <CardTitle className="text-lg">Pilih Worksheet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap mb-2">
              {multiWorksheetPayload.worksheets.map((ws, idx) => (
                <Button
                  key={idx}
                  variant={activeWorksheetIndex === idx ? "default" : "outline"}
                  size="sm"
                  className="h-10 px-4"
                  onClick={() => handleSwitchWorksheet(idx)}
                >
                  {ws.worksheetName || `Sheet ${idx + 1}`}
                </Button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Total Worksheets: {multiWorksheetPayload.worksheets.length}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Validation Summary */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Hasil Validasi Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg w-full">
              <div className="text-3xl font-bold text-blue-600">{validationResults.total}</div>
              <div className="text-lg text-blue-700">Total Record</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg w-full">
              <div className="text-3xl font-bold text-green-600">{validationResults.valid}</div>
              <div className="text-lg text-green-700">Valid</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg w-full">
              <div className="text-3xl font-bold text-red-600">{validationResults.error}</div>
              <div className="text-lg text-red-700">Error</div>
            </div>
          </div>

          {/* Legend explaining colors */}
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-red-50 border-l-4 border-red-500 rounded flex-shrink-0"></div>
              <div>
                <div className="font-semibold text-red-700">❌ Error (Merah)</div>
                <div className="text-sm text-muted-foreground">
                  <strong className="text-red-600">CRITICAL fields:</strong> NIK (INTEGER, UNIQUE, required), Umur (required), Jenis Kelamin (l/p)
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-12 h-12 bg-green-50 border-l-4 border-green-500 rounded flex-shrink-0"></div>
              <div>
                <div className="font-semibold text-green-700">✓ Valid (Hijau)</div>
                <div className="text-sm text-muted-foreground">Data lengkap dan siap untuk disimpan</div>
              </div>
            </div>
          </div>
          
          {/* Field Requirements */}
          <div className="border-t pt-4 mt-4">
            <div className="font-semibold text-sm mb-2">Required Field Validation Rules:</div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>NIK:</strong> ❌ Must be INTEGER, UNIQUE within bulk, and NOT EMPTY (CRITICAL)</li>
              <li><strong>Umur (Age):</strong> ❌ Must be filled with valid age (0-150 years) (REQUIRED)</li>
              <li><strong>Jenis Kelamin (Gender):</strong> ❌ Must contain 'l' (Laki-laki/Male) or 'p' (Perempuan/Female)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Table */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Preview Data Kesehatan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                  {payload?.headerBlock ? (
                    (() => {
                      const hb = payload.headerBlock!;
                      const merges = (hb.merges || []).filter((m: any) => m && typeof m.s?.c === "number");
                      
                      // Only include columns that actually have data in headerKeys
                      const maxCols = headerKeys.length;
                      const headerHeight = Math.max(1, (hb.rows || []).length);

                      // Filter merges to only those that are within the data column range
                      const validMerges = merges.filter((m: any) => {
                        if (!m) return false;
                        const startC = Math.max(0, m.s.c);
                        const endC = m.e.c;
                        // Only include if merge intersects with actual data columns
                        return startC < maxCols && endC >= 0 && m.s.r >= 0 && m.e.r < headerHeight;
                      }).map((m: any) => ({
                        ...m,
                        s: { r: m.s.r, c: Math.max(0, m.s.c) },
                        e: { r: m.e.r, c: Math.min(maxCols - 1, m.e.c) }
                      }));

                      const isInsideMerge = (localR: number, localC: number) => {
                        return validMerges.some((m: any) => 
                          localR >= m.s.r && localR <= m.e.r && localC >= m.s.c && localC <= m.e.c
                        );
                      };

                      const getMergeStartingAt = (localR: number, localC: number) => {
                        return validMerges.find((m: any) => m.s.r === localR && m.s.c === localC);
                      };

                      return Array.from({ length: headerHeight }).map((_, rowIdx) => {
                          const localRowIdx = rowIdx;
                          const consumed = new Set<number>();
                        return (
                          <TableRow key={`hdr-${rowIdx}`}>
                              {Array.from({ length: maxCols }).map((__, colIdx) => {
                                if (consumed.has(colIdx)) return null;

                                const merge = getMergeStartingAt(localRowIdx, colIdx);
                                if (merge) {
                                  const startC = merge.s.c;
                                  const endC = merge.e.c;
                                  const colSpan = Math.max(1, endC - startC + 1);
                                  const rowSpan = Math.max(1, merge.e.r - merge.s.r + 1);
                                  for (let cc = startC; cc <= endC; cc++) consumed.add(cc);
                                  const text = (hb.rows[localRowIdx] && hb.rows[localRowIdx][merge.s.c]) ?? "";
                                  return (
                                    <TableHead key={`h-${rowIdx}-${colIdx}`} colSpan={colSpan} rowSpan={rowSpan} className="text-lg text-center font-bold">
                                      {String(text ?? "").trim() || ""}
                                    </TableHead>
                                  );
                                }

                                if (isInsideMerge(localRowIdx, colIdx)) {
                                  consumed.add(colIdx);
                                  return null;
                                }

                                // Standalone cell: calculate proper rowSpan
                                const remainingRows = headerHeight - localRowIdx;
                                consumed.add(colIdx);
                                const text = (hb.rows[localRowIdx] && hb.rows[localRowIdx][colIdx]) ?? headerLabels[colIdx] ?? headerKeys[colIdx] ?? "";
                                return (
                                  <TableHead key={`h-${rowIdx}-${colIdx}`} colSpan={1} rowSpan={remainingRows} className="text-lg text-center font-bold">
                                    {String(text ?? "").trim() || ""}
                                  </TableHead>
                                );
                              })}
                          </TableRow>
                        );
                      });
                    })()
                  ) : (
                    <TableRow>
                      {headerKeys.map((key, i) => (
                        <TableHead key={key} className="text-lg">
                          {headerLabels[i] ?? key}
                        </TableHead>
                      ))}
                    </TableRow>
                  )}
                </TableHeader>

              <TableBody>
                {rows.map((row) => {
                  const validationStatus = getRowValidationStatus(row);
                  const rowBgClass = 
                    validationStatus === "error" 
                      ? "bg-red-50 hover:bg-red-100" 
                      : "hover:bg-muted/50";

                  return (
                    <TableRow key={String(row.id)} className={rowBgClass}>
                      {headerKeys.map((k) => {
                        const cellValue = row[k];
                        
                        // Apply edits for validation
                        const editedValue = editedRows[String(row.id)]?.[k];
                        const valueToValidate = editedValue !== undefined ? editedValue : cellValue;
                        
                        const cellError = getCellError({ ...row, [k]: valueToValidate }, k);
                        const isCellError = cellError !== null;
                        const isDateCol = isDateField(k);
                        const isGenderCol = k.toLowerCase() === "jk" || (k.toLowerCase().includes("jenis") && k.toLowerCase().includes("kelamin"));
                        
                        // Get edited value if it exists, otherwise use original
                        let displayValue = editedValue ?? cellValue;
                        
                        // Format gender for display if it's a gender field
                        let displayText = displayValue;
                        if (isGenderCol) {
                          displayText = formatGenderDisplay(displayValue);
                        } else if (!isEditing && isDateCol && displayValue !== null && displayValue !== "" && !isNaN(displayValue)) {
                          const numVal = Number(displayValue);
                          if (Number.isInteger(numVal) && numVal > 0) {
                            try {
                              const date = excelSerialToDate(numVal);
                              displayText = formatDateDDMMYYYY(date);
                            } catch (e) {
                              displayText = String(displayValue);
                            }
                          }
                        }

                        return (
                          <TableCell 
                            key={k} 
                            className={`text-lg relative ${isCellError ? "border-l-4 border-red-500 bg-red-50" : ""} ${isEditing ? "p-1" : ""}`}
                            title={cellError || ""}
                          >
                            {isEditing ? (
                              (() => {
                                const lower = k.toLowerCase();
                                const isNumberish = lower.includes("umur") || typeof cellValue === "number";

                                if (isDateCol) {
                                  // For date fields, show in DD/MM/YYYY format when editing
                                  let inputValue = "";
                                  const edited = editedRows[String(row.id)]?.[k];
                                  if (edited !== undefined) {
                                    // If it's been edited, use the edited value as-is
                                    inputValue = String(edited);
                                  } else if (cellValue !== null && cellValue !== "") {
                                    // Check if it's a valid integer (Excel serial)
                                    if (!isNaN(cellValue) && Number.isInteger(Number(cellValue))) {
                                      const numVal = Number(cellValue);
                                      if (numVal > 0) {
                                        try {
                                          const date = excelSerialToDate(numVal);
                                          inputValue = formatDateDDMMYYYY(date);
                                        } catch (e) {
                                          inputValue = String(cellValue);
                                        }
                                      }
                                    } else {
                                      // It's a string (possibly invalid date format) - show it so user can fix it
                                      inputValue = String(cellValue);
                                    }
                                  }
                                  
                                  return (
                                    <input
                                      type="text"
                                      placeholder="DD/MM/YYYY"
                                      className={`w-full border-2 rounded px-2 py-1 ${isCellError ? "border-red-500 bg-red-100" : "border-blue-400 border-dashed"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                      value={inputValue}
                                      onChange={(e) => {
                                        const inputStr = e.target.value;
                                        // Store as-is; validation happens after save
                                        handleCellChange(row.id, k, inputStr);
                                      }}
                                    />
                                  );
                                }

                                if (isNumberish) {
                                  return (
                                    <input
                                      type="number"
                                      className={`w-full border-2 rounded px-2 py-1 ${isCellError ? "border-red-500 bg-red-100" : "border-blue-400 border-dashed"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                      value={String(displayValue ?? "")}
                                      onChange={(e) =>
                                        handleCellChange(row.id, k, e.target.value ? Number(e.target.value) : null)
                                      }
                                    />
                                  );
                                }

                                return (
                                  <input
                                    className={`w-full border-2 rounded px-2 py-1 ${isCellError ? "border-red-500 bg-red-100" : "border-blue-400 border-dashed"} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                    value={String(displayValue ?? "")}
                                    onChange={(e) =>
                                      handleCellChange(row.id, k, e.target.value)
                                    }
                                  />
                                );
                              })()
                            ) : (
                              <div className={isCellError ? "font-semibold" : ""}>
                                <div className={isCellError ? "text-red-600" : ""}>
                                  {String(displayText ?? "-")}
                                </div>
                                {isCellError && (
                                  <div className="text-xs text-red-600 mt-1 font-normal italic">
                                    {cellError}
                                  </div>
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card className="shadow-md">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" size="lg" className="h-12 px-8 text-lg" onClick={handleCancelImport}>
              <X className="w-5 h-5 mr-2" />
              Batalkan Import
            </Button>

            <Button
              size="lg"
              className="h-12 px-8 text-lg"
              onClick={() => void handleConfirmImport()}  // ensure TS treats it as void
              disabled={loading || validationResults.error > 0}
            >
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Konfirmasi & Simpan Data
                </>
              )}
            </Button>
          </div>

          <div className="text-center mt-4">
            {errorMsg && <p className="text-lg text-red-600">{errorMsg}</p>}
            {successMsg && <p className="text-lg text-green-600">{successMsg}</p>}
            <p className="text-lg text-muted-foreground">Data akan disimpan permanen setelah konfirmasi</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
