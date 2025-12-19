// PreviewEditPage.tsx
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

type PreviewEditPageProps = {
  initialData?: any[] | UploadPayload | null;
  onDone?: () => void;
  onCancel?: () => void;
};

type RowIssue = {
  id: string | number;
  index: number; // 1-based display index
  type: "error" | "warning";
  messages: string[];
};

type HeaderCell = {
  text: string;
  rowSpan: number;
  colSpan: number;
  hidden: boolean;
};

/* =========================
   MERGED HEADER UTILITIES
========================= */

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeAndClampMerges(
  merges: any[],
  headerHeight: number,
  maxCols: number
) {
  const out: any[] = [];

  for (const m of merges || []) {
    if (!m?.s || !m?.e) continue;
    if (typeof m.s.r !== "number" || typeof m.s.c !== "number") continue;
    if (typeof m.e.r !== "number" || typeof m.e.c !== "number") continue;

    // clamp to header grid
    const s = {
      r: clamp(m.s.r, 0, headerHeight - 1),
      c: clamp(m.s.c, 0, maxCols - 1),
    };
    const e = {
      r: clamp(m.e.r, 0, headerHeight - 1),
      c: clamp(m.e.c, 0, maxCols - 1),
    };

    // ensure ordering
    const sr = Math.min(s.r, e.r);
    const er = Math.max(s.r, e.r);
    const sc = Math.min(s.c, e.c);
    const ec = Math.max(s.c, e.c);

    // discard no-op merges
    if (sr === er && sc === ec) continue;

    out.push({ s: { r: sr, c: sc }, e: { r: er, c: ec } });
  }

  // bigger merges first to reduce overlap issues
  out.sort((a, b) => {
    const areaA = (a.e.r - a.s.r + 1) * (a.e.c - a.s.c + 1);
    const areaB = (b.e.r - b.s.r + 1) * (b.e.c - b.s.c + 1);
    if (areaB !== areaA) return areaB - areaA;
    if (a.s.r !== b.s.r) return a.s.r - b.s.r;
    return a.s.c - b.s.c;
  });

  return out;
}

function buildHeaderGrid(args: {
  hbRows: any[][];
  merges: any[];
  headerKeys: string[];
  headerLabels: string[];
}) {
  const { hbRows, merges, headerKeys, headerLabels } = args;
  const headerHeight = Math.max(1, hbRows?.length || 1);
  const maxCols = Math.max(1, headerKeys?.length || 1);

  const grid: HeaderCell[][] = Array.from({ length: headerHeight }).map((_, r) =>
    Array.from({ length: maxCols }).map((__, c) => {
      let text = safeStr(hbRows?.[r]?.[c] ?? "");

      // fallback: only for bottom row
      if (!text && r === headerHeight - 1) {
        text = safeStr(headerLabels?.[c] ?? headerKeys?.[c] ?? "");
      }

      return { text, rowSpan: 1, colSpan: 1, hidden: false };
    })
  );

  const covered: boolean[][] = Array.from({ length: headerHeight }).map(() =>
    Array.from({ length: maxCols }).map(() => false)
  );

  const normMerges = normalizeAndClampMerges(merges || [], headerHeight, maxCols);

  for (const m of normMerges) {
    const sr = m.s.r;
    const sc = m.s.c;
    const er = m.e.r;
    const ec = m.e.c;

    // already covered => skip
    if (covered[sr]?.[sc]) continue;

    // overlap conflict => skip
    let conflict = false;
    for (let r = sr; r <= er; r++) {
      for (let c = sc; c <= ec; c++) {
        if (covered[r]?.[c]) {
          conflict = true;
          break;
        }
      }
      if (conflict) break;
    }
    if (conflict) continue;

    grid[sr][sc].rowSpan = er - sr + 1;
    grid[sr][sc].colSpan = ec - sc + 1;

    // if top-left text empty, pick first non-empty in region
    if (!grid[sr][sc].text) {
      let found = "";
      for (let r = sr; r <= er && !found; r++) {
        for (let c = sc; c <= ec; c++) {
          const t = safeStr(hbRows?.[r]?.[c] ?? "");
          if (t) {
            found = t;
            break;
          }
        }
      }
      if (found) grid[sr][sc].text = found;
    }

    for (let r = sr; r <= er; r++) {
      for (let c = sc; c <= ec; c++) {
        if (r === sr && c === sc) continue;
        grid[r][c].hidden = true;
        covered[r][c] = true;
      }
    }
  }

  return { grid, headerHeight, maxCols };
}

/* =========================
   COMPONENT
========================= */

export function PreviewEditPage({
  initialData = null,
  onDone,
  onCancel,
}: PreviewEditPageProps) {
  const [payload, setPayload] = useState<UploadPayload | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | number | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, any> | null>(null);

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

  function normalizeStored(payloadOrArray: any): UploadPayload | null {
    if (!payloadOrArray) return null;
    if (Array.isArray(payloadOrArray)) return payloadFromArray(payloadOrArray);

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
        payloadOrArray.headerLabels ??
        headerKeys.map((k: string) => String(k).toUpperCase());
      const headerOrder = headerKeys;

      return {
        ...payloadOrArray,
        rows,
        headerKeys,
        headerLabels,
        headerOrder,
      };
    }

    return null;
  }

  useEffect(() => {
    if (initialData && !Array.isArray(initialData)) {
      const p = normalizeStored(initialData);
      if (p) {
        setPayload(p);
        return;
      }
    }

    if (initialData && Array.isArray(initialData)) {
      setPayload(payloadFromArray(initialData));
      return;
    }

    try {
      const s = sessionStorage.getItem("previewData");
      if (s) {
        const parsed = JSON.parse(s);
        const p = normalizeStored(parsed);
        if (p) {
          setPayload(p);
          return;
        }
        if (Array.isArray(parsed)) {
          setPayload(payloadFromArray(parsed));
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to read previewData from sessionStorage", e);
    }

    setPayload(null);
  }, [initialData]);

  const rows = payload?.rows ?? null;
  const headerKeys = payload?.headerOrder ?? payload?.headerKeys ?? [];
  const headerLabels =
    payload?.headerLabels ?? headerKeys.map((k) => String(k).toUpperCase());

  /* =========================
     VALIDATION HELPERS
  ========================= */

  const toStr = (v: any) => String(v ?? "").trim();
  const hasValue = (v: any) => toStr(v) !== "";
  const parseNumberSafe = (v: any) => {
    if (v === null || v === undefined || v === "") return NaN;
    const n = Number(String(v).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  };

  const pickField = (r: any, aliases: string[]) => {
    for (const key of Object.keys(r || {})) {
      const lower = key.toLowerCase();
      if (aliases.includes(lower)) return key;
    }
    return null;
  };

  const fieldHints = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const r0 = rows[0];

    const namaKey = pickField(r0, ["nama", "nama_lengkap", "nama lengkap", "name"]);
    const nikKey = pickField(r0, [
      "nik",
      "no_ktp",
      "nomor_ktp",
      "ktp",
      "no_ktpnik",
      "nomor ktp/nik",
    ]);
    const umurKey = pickField(r0, ["umur", "usia", "age"]);
    const bpKey = pickField(r0, ["tekanandarah", "tekanan_darah", "td", "blood_pressure"]);
    const gulaKey = pickField(r0, ["guladarah", "gula_darah", "gds", "blood_sugar"]);

    return { namaKey, nikKey, umurKey, bpKey, gulaKey };
  }, [rows]);

  const validationResults = useMemo(() => {
    if (!rows) return { total: 0, valid: 0, warning: 0, error: 0, issues: [] as RowIssue[] };

    let total = rows.length;
    let valid = 0;
    let warning = 0;
    let errorCount = 0;
    const issues: RowIssue[] = [];

    const namaKey = fieldHints?.namaKey;
    const nikKey = fieldHints?.nikKey;
    const umurKey = fieldHints?.umurKey;
    const bpKey = fieldHints?.bpKey;
    const gulaKey = fieldHints?.gulaKey;

    rows.forEach((r, idx0) => {
      const idx = idx0 + 1;
      const rowId = r?.id ?? `row_${idx}`;

      const msgsError: string[] = [];
      const msgsWarn: string[] = [];

      if (namaKey && !hasValue(r[namaKey])) msgsError.push(`Kolom "${namaKey}" kosong`);
      if (nikKey && !hasValue(r[nikKey])) msgsError.push(`Kolom "${nikKey}" kosong`);
      if (umurKey) {
        const ageNum = parseNumberSafe(r[umurKey]);
        if (Number.isNaN(ageNum)) msgsError.push(`Kolom "${umurKey}" bukan angka`);
      }

      if (bpKey) {
        const bp = toStr(r[bpKey]);
        const sysRaw = bp.includes("/") ? bp.split("/")[0] : bp;
        const sys = parseInt(String(sysRaw).replace(/\D/g, ""), 10);
        if (!Number.isNaN(sys) && sys >= 140) msgsWarn.push(`Tekanan darah tinggi (sistolik ${sys})`);
      }

      if (gulaKey) {
        const sugarNum = parseInt(toStr(r[gulaKey]).replace(/\D/g, ""), 10);
        if (!Number.isNaN(sugarNum) && sugarNum >= 180) msgsWarn.push(`Gula darah tinggi (${sugarNum})`);
      }

      if (msgsError.length > 0) {
        errorCount += 1;
        issues.push({ id: rowId, index: idx, type: "error", messages: msgsError });
        return;
      }

      if (msgsWarn.length > 0) {
        warning += 1;
        issues.push({ id: rowId, index: idx, type: "warning", messages: msgsWarn });
        return;
      }

      valid += 1;
    });

    return { total, valid, warning, error: errorCount, issues };
  }, [rows, fieldHints]);

  const errorIssues = useMemo(
    () => validationResults.issues.filter((x) => x.type === "error"),
    [validationResults.issues]
  );
  const warningIssues = useMemo(
    () => validationResults.issues.filter((x) => x.type === "warning"),
    [validationResults.issues]
  );

  /* =========================
     ✅ FIX: HEADER MEMO MUST BE ABOVE ANY EARLY RETURN
  ========================= */

  const headerRender = useMemo(() => {
    if (!payload?.headerBlock) return null;
    if (!headerKeys?.length) return null;

    const hb = payload.headerBlock;
    return buildHeaderGrid({
      hbRows: hb.rows || [],
      merges: hb.merges || [],
      headerKeys,
      headerLabels,
    });
  }, [payload?.headerBlock, headerKeys, headerLabels]);

  /* =========================
     EDITING
  ========================= */

  const startEdit = (row: any) => {
    setEditingRowId(row.id);
    setEditDraft({ ...row });
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditDraft(null);
    setIsEditing(false);
  };

  const saveEdit = () => {
    if (editingRowId === null || !editDraft || !payload) return;

    const newRows = payload.rows.map((r) => (r.id === editingRowId ? { ...r, ...editDraft } : r));
    const newPayload: UploadPayload = { ...payload, rows: newRows };
    setPayload(newPayload);

    try {
      sessionStorage.setItem("previewData", JSON.stringify(newPayload));
    } catch (e) {
      console.warn("sessionStorage write failed", e);
    }

    setEditingRowId(null);
    setEditDraft(null);
    setIsEditing(false);
    setSuccessMsg("Perubahan disimpan sementara.");
    setTimeout(() => setSuccessMsg(null), 1600);
  };

  /* =========================
     ACTIONS
  ========================= */

  const handleCancelImport = (): void => {
    try {
      sessionStorage.removeItem("previewData");
      sessionStorage.removeItem("uploadStep");
      sessionStorage.removeItem("uploadFileName");
    } catch (e) {
      console.warn("sessionStorage remove failed", e);
    }

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
    setSuccessMsg("Import dibatalkan.");
    setTimeout(() => setSuccessMsg(null), 1600);
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
      const body = {
        kabupaten: payload?.kabupaten ?? "",
        puskesmas: payload?.puskesmas ?? "",
        bulanTahun: payload?.bulanTahun ?? "",
        metaPairs: payload?.metaPairs ?? [],
        headerKeys: payload?.headerKeys ?? payload?.headerOrder ?? [],
        headerLabels: payload?.headerLabels ?? [],
        headerOrder: payload?.headerOrder ?? payload?.headerKeys ?? [],
        rowData: rows,
        fileName: payload?.fileName,
        sourceSheetName: payload?.sourceSheetName,
      };

      const { data } = await api.post("/elderly-reports", body);
      if (!data?.reportId) throw new Error("Response tidak valid dari server.");

      setSuccessMsg("Data berhasil diimpor ke database.");
      sessionStorage.removeItem("previewData");

      try {
        window.dispatchEvent(new CustomEvent("elderly-reports-updated"));
      } catch {}

      if (typeof onDone === "function") onDone();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Gagal mengimpor data. Coba lagi.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     EARLY UI STATES (SAFE NOW)
  ========================= */

  if (!rows) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-3xl font-semibold">Preview and Edit Data</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Tidak ada data preview. Silakan unggah file terlebih dahulu.
          </p>
          <div className="text-sm text-muted-foreground mt-2">
            File:{" "}
            <strong>
              {payload?.fileName ?? sessionStorage.getItem("uploadFileName") ?? "unknown"}
            </strong>
          </div>
        </div>
        {errorMsg && <div className="text-red-600">{errorMsg}</div>}
        {successMsg && <div className="text-green-600">{successMsg}</div>}
      </div>
    );
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Preview and Edit Data</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Review dan edit data sebelum menyimpan ke sistem
          </p>

          <div className="mt-3 text-sm text-muted-foreground space-y-1">
            <div>
              File: <strong>{payload?.fileName ?? "-"}</strong>
            </div>
            <div>
              KABUPATEN: <strong>{payload?.kabupaten ?? "-"}</strong>
            </div>
            <div>
              PUSKESMAS: <strong>{payload?.puskesmas ?? "-"}</strong>
            </div>
            <div>
              BULAN/TAHUN: <strong>{payload?.bulanTahun ?? "-"}</strong>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-6 text-lg"
            onClick={() => setIsEditing((s) => !s)}
          >
            <Edit3 className="w-5 h-5 mr-2" />
            {isEditing ? "Batal Edit" : "Edit Data"}
          </Button>

          <Button
            size="lg"
            className="h-12 px-6 text-lg"
            onClick={() => {
              try {
                if (payload) sessionStorage.setItem("previewData", JSON.stringify(payload));
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
        </div>
      </div>

      {/* Validation Summary */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Hasil Validasi Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{validationResults.total}</div>
              <div className="text-lg text-blue-700">Total Record</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{validationResults.valid}</div>
              <div className="text-lg text-green-700">Valid</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{validationResults.warning}</div>
              <div className="text-lg text-yellow-700">Peringatan</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{validationResults.error}</div>
              <div className="text-lg text-red-700">Error</div>
            </div>
          </div>

          {errorIssues.length > 0 && (
            <div className="border rounded-lg p-4 bg-red-50">
              <div className="font-semibold text-red-700 text-lg mb-2">
                Detail Error (per baris)
              </div>
              <div className="space-y-2">
                {errorIssues.slice(0, 30).map((iss) => (
                  <div key={`err-${iss.id}`} className="text-red-800">
                    <span className="font-semibold">Row #{iss.index}:</span>{" "}
                    {iss.messages.join(" • ")}
                  </div>
                ))}
                {errorIssues.length > 30 && (
                  <div className="text-red-700">
                    Menampilkan 30 error pertama. Total error: {errorIssues.length}.
                  </div>
                )}
              </div>
            </div>
          )}

          {warningIssues.length > 0 && (
            <div className="border rounded-lg p-4 bg-yellow-50">
              <div className="font-semibold text-yellow-800 text-lg mb-2">
                Detail Peringatan (per baris)
              </div>
              <div className="space-y-2">
                {warningIssues.slice(0, 30).map((iss) => (
                  <div key={`warn-${iss.id}`} className="text-yellow-900">
                    <span className="font-semibold">Row #{iss.index}:</span>{" "}
                    {iss.messages.join(" • ")}
                  </div>
                ))}
                {warningIssues.length > 30 && (
                  <div className="text-yellow-800">
                    Menampilkan 30 warning pertama. Total warning: {warningIssues.length}.
                  </div>
                )}
              </div>
            </div>
          )}
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
                {payload?.headerBlock && headerRender ? (
                  (() => {
                    const { grid, headerHeight, maxCols } = headerRender;

                    return Array.from({ length: headerHeight }).map((_, r) => (
                      <TableRow key={`hdr-${r}`}>
                        {Array.from({ length: maxCols }).map((__, c) => {
                          const cell = grid[r][c];
                          if (cell.hidden) return null;

                          return (
                            <TableHead
                              key={`h-${r}-${c}`}
                              colSpan={cell.colSpan}
                              rowSpan={cell.rowSpan}
                              className="text-lg text-center font-bold whitespace-pre-line"
                            >
                              {cell.text || ""}
                            </TableHead>
                          );
                        })}

                        {r === 0 && isEditing && (
                          <TableHead
                            rowSpan={headerHeight}
                            className="text-lg text-center font-bold"
                          >
                            Aksi
                          </TableHead>
                        )}
                      </TableRow>
                    ));
                  })()
                ) : (
                  <TableRow>
                    {headerKeys.map((key, i) => (
                      <TableHead key={key} className="text-lg">
                        {headerLabels[i] ?? key}
                      </TableHead>
                    ))}
                    {isEditing && <TableHead className="text-lg">Aksi</TableHead>}
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {rows.map((row, idx0) => {
                  const rowIndex = idx0 + 1;
                  const rowIssue = validationResults.issues.find(
                    (x) => String(x.id) === String(row.id)
                  );
                  const rowHasError = rowIssue?.type === "error";
                  const rowHasWarning = rowIssue?.type === "warning";

                  return (
                    <TableRow
                      key={String(row.id)}
                      className={rowHasError ? "bg-red-50" : rowHasWarning ? "bg-yellow-50" : undefined}
                    >
                      {headerKeys.map((k) => {
                        const cellValue = row[k];
                        const isEditingThisRow = editingRowId === row.id;

                        return (
                          <TableCell key={k} className="text-lg">
                            {isEditing && isEditingThisRow ? (
                              (() => {
                                const lower = k.toLowerCase();
                                const isNumberish = lower.includes("umur") || typeof cellValue === "number";

                                if (isNumberish) {
                                  return (
                                    <input
                                      type="number"
                                      className="w-28 border rounded px-2 py-1"
                                      value={String(editDraft?.[k] ?? cellValue ?? "")}
                                      onChange={(e) =>
                                        setEditDraft((d) => ({
                                          ...(d ?? row),
                                          [k]: e.target.value ? Number(e.target.value) : null,
                                        }))
                                      }
                                    />
                                  );
                                }

                                return (
                                  <input
                                    className="w-full border rounded px-2 py-1"
                                    value={String(editDraft?.[k] ?? cellValue ?? "")}
                                    onChange={(e) =>
                                      setEditDraft((d) => ({ ...(d ?? row), [k]: e.target.value }))
                                    }
                                  />
                                );
                              })()
                            ) : (
                              String(cellValue ?? "-")
                            )}
                          </TableCell>
                        );
                      })}

                      {isEditing && (
                        <TableCell>
                          {editingRowId === row.id ? (
                            <div className="flex gap-2">
                              <Button size="sm" className="h-8 px-3" onClick={saveEdit}>
                                <Save className="w-4 h-4 mr-1" />
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 px-3" onClick={cancelEdit}>
                                Batal
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                                onClick={() => startEdit(row)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              {(rowHasError || rowHasWarning) && (
                                <span className={rowHasError ? "text-red-700 text-sm" : "text-yellow-800 text-sm"}>
                                  {rowHasError ? "ERROR" : "WARNING"} #{rowIndex}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
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
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-lg"
              onClick={handleCancelImport}
            >
              <X className="w-5 h-5 mr-2" />
              Batalkan Import
            </Button>

            <Button
              size="lg"
              className="h-12 px-8 text-lg"
              onClick={() => void handleConfirmImport()}
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
            <p className="text-lg text-muted-foreground">
              Data akan disimpan permanen setelah konfirmasi
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
