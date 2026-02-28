// UploadPage.tsx
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Upload, FileText, CheckCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type UploadPageProps = {
  onNavigate?: (page: string, state?: any) => void;
};

type MetaPair = { key: string; value: string };

type UploadPayload = {
  kabupaten: string;
  puskesmas: string;
  bulanTahun: string;
  metaPairs: MetaPair[];

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

export function UploadPage({ onNavigate }: UploadPageProps) {
  const [uploadStep, setUploadStepState] = useState<number>(1);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const setUploadStep = (s: number) => {
    setUploadStepState(s);
    try {
      sessionStorage.setItem("uploadStep", String(s));
    } catch (e) {
      console.warn("persist uploadStep failed", e);
    }
  };

  useEffect(() => {
    try {
      const persistedStep = sessionStorage.getItem("uploadStep");
      if (persistedStep) setUploadStepState(Number(persistedStep));
      const persistedName = sessionStorage.getItem("uploadFileName");
      if (persistedName) setFileName(persistedName);
    } catch (e) {
      console.warn("failed reading persisted upload state", e);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      setUploadStep(1);
      setFileName(null);
      setFileError(null);
      try {
        sessionStorage.removeItem("previewData");
      } catch (err) {}
    };

    window.addEventListener("upload-reset", handler as EventListener);
    return () => window.removeEventListener("upload-reset", handler as EventListener);
  }, []);

  const steps = [
    {
      number: 1,
      title: "Pilih File Data",
      description: "Upload file Excel atau CSV berisi data kesehatan lansia",
      status:
        uploadStep > 1 ? "completed" : uploadStep === 1 ? "active" : "pending",
    },
    {
      number: 2,
      title: "Validasi Data",
      description: "Sistem akan memeriksa format dan kelengkapan data",
      status:
        uploadStep > 2 ? "completed" : uploadStep === 2 ? "active" : "pending",
    },
    {
      number: 3,
      title: "Konfirmasi Import",
      description: "Review data sebelum disimpan ke sistem",
      status:
        uploadStep > 3 ? "completed" : uploadStep === 3 ? "active" : "pending",
    },
  ];

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  function detectHeaderRow(arr: Array<any[]>, maxScanRows = 12, minNonEmptyCells = 3) {
    const rowsToCheck = Math.min(maxScanRows, arr.length);
    let bestIdx = 0;
    let bestCount = -1;
    for (let i = 0; i < rowsToCheck; i++) {
      const row = arr[i] || [];
      const nonEmpty = row.reduce(
        (acc, c) => acc + (c !== null && c !== undefined && String(c).trim() !== "" ? 1 : 0),
        0
      );
      if (nonEmpty > bestCount) {
        bestCount = nonEmpty;
        bestIdx = i;
      }
    }
    if (bestCount < minNonEmptyCells) return 0;
    return bestIdx;
  }

  function normalizeHeaders(raw: any[]) {
    const seen: Record<string, number> = {};
    return raw.map((h, i) => {
      const s = String(h ?? "").trim();
      const base = s === "" ? `column_${i + 1}` : s;
      let key = base
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s\-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .replace(/-+/g, "_")
        .toLowerCase();
      if (!key) key = `column_${i + 1}`;
      if (seen[key]) {
        seen[key] += 1;
        key = `${key}_${seen[key]}`;
      } else {
        seen[key] = 1;
      }
      return key;
    });
  }

  function cleanCell(v: any) {
    return String(v ?? "").replace(/\s+/g, " ").trim();
  }

  function isStopMarkerB(cellB: any) {
    const s = cleanCell(cellB).toLowerCase();
    return s.startsWith("diketahui");
  }

  function readMetaPairsFromAoA(rawAoA: any[][]) {
    const pairsSpec = [
      { row: 1, keyCol: 1, valCol: 2 },
      { row: 2, keyCol: 1, valCol: 2 },
      { row: 3, keyCol: 1, valCol: 2 },
    ];

    const metaPairs: MetaPair[] = [];
    for (const p of pairsSpec) {
      const key = cleanCell(rawAoA?.[p.row]?.[p.keyCol]);
      const value = cleanCell(rawAoA?.[p.row]?.[p.valCol]);
      if (key && value) metaPairs.push({ key, value });
    }

    const metaMap: Record<string, string> = {};
    metaPairs.forEach(({ key, value }) => {
      const k = key.toLowerCase();
      if (k.includes("kabupaten")) metaMap.kabupaten = value;
      else if (k.includes("puskesmas")) metaMap.puskesmas = value;
      else if (k.includes("bulan")) {
        let cleanedValue = value
          .replace(/^:\s*/, "") // Remove leading ": " or ":"
          .replace(/\s*\/\s*/g, " ") // Replace "/" with spaces
          .trim();
        metaMap.bulanTahun = cleanedValue;
      }
    });

    return { metaPairs, metaMap };
  }

  function findStopRowIndex(rawAoA: any[][], startScanRowIdx: number) {
    for (let r = startScanRowIdx; r < rawAoA.length; r++) {
      const colB = rawAoA?.[r]?.[1]; // Column B
      if (isStopMarkerB(colB)) return r;
    }
    return rawAoA.length;
  }

  function fillMergedCellsFromSheet(ws: XLSX.WorkSheet, aoa: any[][]) {
    const merges = ws && (ws["!merges"] as any[]) ? (ws["!merges"] as any[]) : [];
    if (!merges.length) return;

    for (const m of merges) {
      const s = m.s; // { r: startRow, c: startCol }
      const e = m.e; // { r: endRow, c: endCol }

      // ensure aoa has enough rows
      while (aoa.length <= e.r) aoa.push([]);

      // Try to get value from worksheet cell (top-left) first, fallback to aoa
      const startAddr = XLSX.utils.encode_cell({ r: s.r, c: s.c });
      const startCell = ws[startAddr];
      const startVal =
        startCell && typeof startCell.v !== "undefined" ? startCell.v : (aoa[s.r] && aoa[s.r][s.c]) ?? "";

      for (let r = s.r; r <= e.r; r++) {
        aoa[r] = aoa[r] || [];
        for (let c = s.c; c <= e.c; c++) {
          // if the target cell is empty or undefined, fill with startVal
          const current = typeof aoa[r][c] !== "undefined" ? aoa[r][c] : "";
          if (current === "" || current === null || typeof current === "undefined") {
            aoa[r][c] = startVal;
          }
        }
      }
    }
  }

  // Process a single worksheet and return UploadPayload
  function processWorksheet(workbook: XLSX.WorkBook, sheetName: string): UploadPayload | null {
    try {
      const worksheet = workbook.Sheets[sheetName];
      if (!worksheet) return null;

      // Full sheet AoA
      const rawAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      // apply merged-cell propagation so merged ranges show the top-left value in all cells
      fillMergedCellsFromSheet(worksheet, rawAoA);

      // Meta pairs: B2/C2, B3/C3, B4/C4
      const { metaPairs, metaMap } = readMetaPairsFromAoA(rawAoA);

      // Data stop marker
      const visibleStartRow = 5; // hide rows 1..5 (1-based). zero-based index 5 is row 6 in Excel.
      const stopRowIdx = findStopRowIndex(rawAoA, visibleStartRow);

      // Work only inside [visibleStartRow..stop)
      const sliced = rawAoA.slice(visibleStartRow, stopRowIdx);

      // Inspect merged ranges to detect a multi-row header block (if present)
      const allMerges = worksheet["!merges"] || [];
      // only consider merges that start within the visible header area (after hidden rows)
      const mergesInTop = (allMerges as any[]).filter((m) => m && typeof m.s?.r === "number" && m.s.r >= visibleStartRow && m.s.r < stopRowIdx);

      let headerStart = -1;
      let headerEnd = -1;
      if (mergesInTop.length > 0) {
        headerStart = Math.min(...mergesInTop.map((m) => m.s.r));
        headerEnd = Math.max(...mergesInTop.map((m) => m.e.r));
        // guard: keep header block inside visible range
        if (headerStart < visibleStartRow) headerStart = visibleStartRow;
        if (headerEnd >= stopRowIdx) headerEnd = stopRowIdx - 1;
      } else {
        // fallback: single-row header detection (previous behaviour)
        const localHeaderOffset = detectHeaderRow(sliced, 20, 3);
        headerStart = visibleStartRow + localHeaderOffset;
        headerEnd = headerStart;
      }

      // bottom-most header row is the last row of the header block
      const bottomHeaderRowIndex = headerEnd;

      const rawHeaderRow = rawAoA[bottomHeaderRowIndex] ?? [];

      // Trim leading empty columns so header/merge columns align to visible data columns
      const firstNonEmptyCol = rawHeaderRow.findIndex((c: any) => cleanCell(c) !== "");
      const leftCol = firstNonEmptyCol >= 0 ? firstNonEmptyCol : 0;

      const trimmedHeaderRow = (rawHeaderRow || []).slice(leftCol);
      const headerKeys = normalizeHeaders(trimmedHeaderRow);
      const headerLabels: string[] = trimmedHeaderRow.map((c: any) => cleanCell(c));
      const headerOrder = [...headerKeys];

      // Body rows: from (bottomHeaderRowIndex+1) to stopRowIdx (exclusive)
      const bodyAoA = rawAoA.slice(bottomHeaderRowIndex + 1, stopRowIdx);

      // Convert AoA to objects using headerKeys
      const cleanedRows = bodyAoA
        .filter((rowArr) => (rowArr || []).some((x) => cleanCell(x) !== "")) // skip empty row
        .map((rowArr, idx) => {
          const obj: Record<string, any> = {};
          headerKeys.forEach((k, i) => {
            const v = rowArr?.[leftCol + i] ?? "";
            obj[k] = typeof v === "string" ? v.trim() : v;
          });
          obj.id = `row_${Date.now()}_${idx + 1}`;
          return obj;
        });

      if (cleanedRows.length === 0) {
        return null;
      }

      // normalize merges to the trimmed-left column coordinates so preview can render using local indices
      const rawHeaderBlockRows = rawAoA.slice(headerStart, headerEnd + 1);
      const normalizedMerges = (mergesInTop || []).map((m: any) => ({
        s: { r: m.s.r - headerStart, c: m.s.c - leftCol },
        e: { r: m.e.r - headerStart, c: m.e.c - leftCol },
      }));

      const headerBlock = {
        start: headerStart,
        end: headerEnd,
        rows: rawHeaderBlockRows.map((r) => (r || []).slice(leftCol)),
        merges: normalizedMerges,
      };

      const payload: UploadPayload = {
        kabupaten: metaMap.kabupaten ?? "",
        puskesmas: metaMap.puskesmas ?? "",
        bulanTahun: metaMap.bulanTahun ?? "",
        metaPairs,

        rows: cleanedRows,
        headerKeys,
        headerLabels,
        headerOrder,

        fileName: undefined,
        sourceSheetName: sheetName,
        headerBlock,
      };

      return payload;
    } catch (err) {
      console.warn(`Error processing sheet "${sheetName}":`, err);
      return null;
    }
  }

  const handleFile = (file: File) => {
    setFileError(null);

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File terlalu besar. Maksimum 10MB.");
      return;
    }

    setFileName(file.name);
    try {
      sessionStorage.setItem("uploadFileName", file.name);
    } catch (e) {
      console.warn("persist filename failed", e);
    }

    const reader = new FileReader();

    reader.onerror = (err) => {
      console.error("FileReader error", err);
      setFileError("Failed reading file. Try again.");
    };

    reader.onload = (ev) => {
      try {
        const arrayBuffer = ev.target?.result;
        if (!arrayBuffer) throw new Error("Empty file result");

        const data = new Uint8Array(arrayBuffer as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("No sheets found in workbook");
        }

        // Process all sheets
        const processedSheets: WorksheetData[] = [];
        let hasValidSheets = false;

        for (const sheetName of workbook.SheetNames) {
          const payload = processWorksheet(workbook, sheetName);
          if (payload) {
            processedSheets.push({
              ...payload,
              worksheetName: sheetName,
            });
            hasValidSheets = true;
          }
        }

        if (!hasValidSheets || processedSheets.length === 0) {
          setFileError("Tidak ada row data yang terbaca di semua sheet (cek format dan posisi tabel).");
          return;
        }

        // Decide: single sheet or multi-sheet payload
        let dataToSave: UploadPayload | MultiWorksheetPayload;

        if (processedSheets.length === 1) {
          // Single sheet: save as regular UploadPayload
          dataToSave = {
            ...processedSheets[0],
            fileName: file.name,
          };
        } else {
          // Multiple sheets: save as MultiWorksheetPayload
          dataToSave = {
            fileName: file.name,
            worksheets: processedSheets,
            activeWorksheetIndex: 0,
          };
        }

        // Step -> persist quickly
        setUploadStep(2);

        try {
          sessionStorage.setItem("previewData", JSON.stringify(dataToSave));
        } catch (err) {
          console.warn("sessionStorage write failed", err);
        }

        // simulate validation then navigate to preview
        setTimeout(() => {
          setUploadStep(3);

          if (typeof onNavigate === "function") {
            onNavigate("preview", { data: dataToSave });
          }

          try {
            window.dispatchEvent(new CustomEvent("preview-ready", { detail: { timestamp: Date.now() } }));
          } catch (err) {
            console.warn("dispatch preview-ready failed", err);
          }
        }, 700);
      } catch (err: any) {
        console.error("Parsing error:", err);
        setFileError("Error parsing file. Make sure it's a valid Excel/CSV file.");
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) {
      setFileError("No file dropped");
      return;
    }
    handleFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-3xl font-semibold">Upload Document</h2>
        <p className="text-xl text-muted-foreground mt-2">Import data kesehatan lansia ke dalam sistem</p>
        {fileName && (
          <div className="text-sm text-muted-foreground mt-2">
            File terakhir: <strong>{fileName}</strong>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Langkah-langkah Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                    step.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : step.status === "active"
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {step.status === "completed" ? <CheckCircle className="w-6 h-6" /> : step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-lg text-muted-foreground">{step.description}</p>
                </div>
                <Badge
                  variant={step.status === "completed" ? "default" : step.status === "active" ? "secondary" : "outline"}
                  className="text-sm px-3 py-1"
                >
                  {step.status === "completed" ? "Selesai" : step.status === "active" ? "Aktif" : "Menunggu"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Area Upload File</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-semibold mb-2">Seret file ke sini atau klik untuk browse</h3>
                <p className="text-lg text-muted-foreground mb-4">
                  Format yang didukung: .xlsx, .csv, .xls (Maksimal 10MB)
                </p>
              </div>
              <Button size="lg" className="h-12 px-8 text-lg" onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-5 h-5 mr-2" />
                Pilih File
              </Button>
              <input ref={fileInputRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </div>
            {fileError && <div className="mt-4 text-red-600 text-center">{fileError}</div>}
          </div>

          {uploadStep > 1 && (
            <div className="mt-6 p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                {uploadStep === 2 ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                )}
                <span className="text-lg">{uploadStep === 2 ? "Memproses file..." : "File berhasil divalidasi"}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guidelines */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Panduan Format Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-xl font-semibold mb-3">Kolom Wajib:</h4>
              <ul className="space-y-2 text-lg">
                <li>• Nama Lengkap</li>
                <li>• Nomor KTP/NIK</li>
                <li>• Tanggal Lahir</li>
                <li>• Alamat</li>
                <li>• Nomor Telepon</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-semibold mb-3">Data Kesehatan:</h4>
              <ul className="space-y-2 text-lg">
                <li>• Tekanan Darah</li>
                <li>• Gula Darah</li>
                <li>• Berat & Tinggi Badan</li>
                <li>• Riwayat Penyakit</li>
                <li>• Obat yang Dikonsumsi</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
