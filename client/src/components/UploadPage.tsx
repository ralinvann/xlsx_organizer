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

export function UploadPage({ onNavigate }: UploadPageProps) {
  const [uploadStep, setUploadStepState] = useState<number>(1);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // helper that updates state AND persists uploadStep
  const setUploadStep = (s: number) => {
    setUploadStepState(s);
    try {
      sessionStorage.setItem("uploadStep", String(s));
    } catch (e) {
      console.warn("persist uploadStep failed", e);
    }
  };

  // read persisted uploadStep/fileName on mount so UI stages persist
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

  const steps = [
    { number: 1, title: "Pilih File Data", description: "Upload file Excel atau CSV berisi data kesehatan lansia", status: uploadStep > 1 ? "completed" : uploadStep === 1 ? "active" : "pending" },
    { number: 2, title: "Validasi Data", description: "Sistem akan memeriksa format dan kelengkapan data", status: uploadStep > 2 ? "completed" : uploadStep === 2 ? "active" : "pending" },
    { number: 3, title: "Konfirmasi Import", description: "Review data sebelum disimpan ke sistem", status: uploadStep > 3 ? "completed" : uploadStep === 3 ? "active" : "pending" }
  ];

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  // --- parsing helpers (same as before) -----------------------------------
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  function detectHeaderRow(arr: Array<any[]>, maxScanRows = 12, minNonEmptyCells = 3) {
    const rowsToCheck = Math.min(maxScanRows, arr.length);
    let bestIdx = 0;
    let bestCount = -1;
    for (let i = 0; i < rowsToCheck; i++) {
      const row = arr[i] || [];
      const nonEmpty = row.reduce((acc, c) => acc + (c !== null && c !== undefined && String(c).trim() !== "" ? 1 : 0), 0);
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
  // ------------------------------------------------------------------------

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

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheets found");

        const worksheet = workbook.Sheets[sheetName];

        // Read sheet as AoA for header detection
        const rawAoA: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const headerRowIndex = detectHeaderRow(rawAoA, 12, 3);
        const rawHeaderRow = rawAoA[headerRowIndex] ?? [];
        const headerKeys = normalizeHeaders(rawHeaderRow);
        const headerLabels: string[] = (rawHeaderRow || []).map((c: any) => (c == null ? "" : String(c).trim()));
        const headerOrder = [...headerKeys];

        // Convert rows using headerKeys
        const json = XLSX.utils.sheet_to_json(worksheet, {
          header: headerKeys,
          range: headerRowIndex,
          defval: "",
          raw: false,
        }) as Record<string, any>[];

        // filter duplicate header-like rows
        function looksLikeHeaderRow(rowObj: Record<string, any>) {
          let matches = 0;
          let total = 0;
          for (let i = 0; i < headerKeys.length; i++) {
            const key = headerKeys[i];
            const label = (headerLabels[i] ?? "").trim().toLowerCase();
            const val = (String(rowObj[key] ?? "").trim()).toLowerCase();
            if (val !== "") {
              total += 1;
              if (label && val === label) matches += 1;
            }
          }
          if (total === 0) return false;
          return matches >= Math.ceil(total / 2);
        }

        const cleanedRows = (json || []).filter((r) => !looksLikeHeaderRow(r)).map((r, idx) => {
          const cleaned: Record<string, any> = {};
          for (const k of headerKeys) {
            const v = r[k];
            cleaned[k] = typeof v === "string" ? v.trim() : v;
          }
          cleaned.id = cleaned.id ?? `row_${Date.now()}_${idx + 1}`;
          return cleaned;
        });

        const payload = {
          rows: cleanedRows,
          headerKeys,
          headerLabels,
          headerOrder,
          fileName: file.name, // include filename in payload
        };

        // Update UI step -> persist quickly
        setUploadStep(2);

        // persist the full payload as fallback BEFORE navigation
        try {
          sessionStorage.setItem("previewData", JSON.stringify(payload));
        } catch (err) {
          console.warn("sessionStorage write failed", err);
        }

        // simulate validation then navigate to preview
        setTimeout(() => {
          setUploadStep(3);

          // Primary path: notify parent (App) if provided
          if (typeof onNavigate === "function") {
            onNavigate("preview", { data: payload });
          }

          // Always emit fallback event so App (or any other listener) can pick it up
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
        <p className="text-xl text-muted-foreground mt-2">
          Import data kesehatan lansia ke dalam sistem
        </p>
        {fileName && <div className="text-sm text-muted-foreground mt-2">File terakhir: <strong>{fileName}</strong></div>}
      </div>

      {/* ... rest of JSX unchanged (progress cards, upload area, guidelines) ... */}

      {/* Progress Steps */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Langkah-langkah Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step) => (
              <div key={step.number} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700' :
                  step.status === 'active' ? 'bg-primary text-primary-foreground' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {step.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : step.number}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-lg text-muted-foreground">{step.description}</p>
                </div>
                <Badge variant={
                  step.status === 'completed' ? 'default' :
                  step.status === 'active' ? 'secondary' :
                  'outline'
                } className="text-sm px-3 py-1">
                  {step.status === 'completed' ? 'Selesai' :
                   step.status === 'active' ? 'Aktif' : 'Menunggu'}
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
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
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
                <p className="text-lg text-muted-foreground mb-4">Format yang didukung: .xlsx, .csv, .xls (Maksimal 10MB)</p>
              </div>
              <Button
                size="lg"
                className="h-12 px-8 text-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-5 h-5 mr-2" />
                Pilih File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
            </div>
            {fileError && <div className="mt-4 text-red-600 text-center">{fileError}</div>}
          </div>

          {uploadStep > 1 && (
            <div className="mt-6 p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                {uploadStep === 2 ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div> : <CheckCircle className="w-6 h-6 text-green-600" />}
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
