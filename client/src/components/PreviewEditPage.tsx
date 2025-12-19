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
      if (obj.id === undefined || obj.id === null)
        obj.id = `row_${Date.now()}_${i + 1}`;
      Object.keys(obj).forEach((k) => {
        if (typeof obj[k] === "string") obj[k] = obj[k].trim();
      });
      return obj;
    });
    const headerKeys =
      rows.length > 0 ? Object.keys(rows[0]).filter((k) => k !== "id") : [];
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
        if (obj.id === undefined || obj.id === null)
          obj.id = `row_${Date.now()}_${i + 1}`;
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
  const headerLabels = payload?.headerLabels ?? headerKeys.map((k) => String(k).toUpperCase());

  // -------- helpers for validation ----------
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

  // Build a flexible mapping so you can validate even if headers are normalized:
  // "nama_lengkap", "nama", "nik", "no_ktp", etc.
  const fieldHints = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const r0 = rows[0];

    const namaKey = pickField(r0, ["nama", "nama_lengkap", "nama lengkap", "name"]);
    const nikKey = pickField(r0, ["nik", "no_ktp", "nomor_ktp", "ktp", "no_ktpnik", "nomor ktp/nik"]);
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

      // Required checks only if the column exists in the file
      if (namaKey && !hasValue(r[namaKey])) msgsError.push(`Kolom "${namaKey}" kosong`);
      if (nikKey && !hasValue(r[nikKey])) msgsError.push(`Kolom "${nikKey}" kosong`);
      if (umurKey) {
        const ageNum = parseNumberSafe(r[umurKey]);
        if (Number.isNaN(ageNum)) msgsError.push(`Kolom "${umurKey}" bukan angka`);
      }

      // Warning checks (if present)
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

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-semibold">Preview and Edit Data</h2>
          <p className="text-xl text-muted-foreground mt-2">
            Review dan edit data sebelum menyimpan ke sistem
          </p>

          <div className="mt-3 text-sm text-muted-foreground space-y-1">
            <div>File: <strong>{payload?.fileName ?? "-"}</strong></div>
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

          {/* Show exactly which rows fail */}
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
                {payload?.headerBlock ? (
                  (() => {
                    const hb = payload.headerBlock!;
                    const merges = (hb.merges || []).filter((m: any) => m && typeof m.s?.c === "number");
                    const headerHeight = Math.max(1, (hb.rows || []).length);
                    const maxCols = headerKeys.length;

                    const visibleMerges = merges.filter((m: any) => {
                      if (!m) return false;
                      const startC = Math.max(0, m.s.c);
                      const endC = m.e.c;
                      return startC <= maxCols - 1 && endC >= 0 && m.s.r >= 0 && m.e.r < headerHeight;
                    });

                    const isInsideMerge = (localR: number, localC: number) =>
                      visibleMerges.some((m: any) => localR >= m.s.r && localR <= m.e.r && localC >= m.s.c && localC <= m.e.c);

                    const getMergeStartingAt = (localR: number, localC: number) =>
                      visibleMerges.find((m: any) => m.s.r === localR && m.s.c === localC);

                    return Array.from({ length: headerHeight }).map((_, rowIdx) => {
                      const localRowIdx = rowIdx;
                      const consumed = new Set<number>();
                      return (
                        <TableRow key={`hdr-${rowIdx}`}>
                          {Array.from({ length: maxCols }).map((__, colIdx) => {
                            if (consumed.has(colIdx)) return null;

                            const merge = getMergeStartingAt(localRowIdx, colIdx);
                            if (merge) {
                              const startC = Math.max(0, merge.s.c);
                              const endC = Math.min(maxCols - 1, merge.e.c);
                              const colSpan = Math.max(1, endC - startC + 1);
                              const rowSpan = Math.max(1, merge.e.r - merge.s.r + 1);
                              for (let cc = startC; cc <= endC; cc++) consumed.add(cc);
                              const text = (hb.rows[localRowIdx] && hb.rows[localRowIdx][startC]) ?? "";
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

                            const rowSpan = headerHeight - localRowIdx;
                            consumed.add(colIdx);
                            const text =
                              (hb.rows[localRowIdx] && hb.rows[localRowIdx][colIdx]) ??
                              headerLabels[colIdx] ??
                              headerKeys[colIdx] ??
                              "";
                            return (
                              <TableHead key={`h-${rowIdx}-${colIdx}`} colSpan={1} rowSpan={rowSpan} className="text-lg text-center font-bold">
                                {String(text ?? "").trim() || ""}
                              </TableHead>
                            );
                          })}

                          {rowIdx === 0 && isEditing && (
                            <TableHead rowSpan={headerHeight} className="text-lg text-center font-bold">
                              Aksi
                            </TableHead>
                          )}
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
                    {isEditing && <TableHead className="text-lg">Aksi</TableHead>}
                  </TableRow>
                )}
              </TableHeader>

              <TableBody>
                {rows.map((row, idx0) => {
                  const rowIndex = idx0 + 1;
                  const rowIssue = validationResults.issues.find((x) => String(x.id) === String(row.id));
                  const rowHasError = rowIssue?.type === "error";
                  const rowHasWarning = rowIssue?.type === "warning";

                  return (
                    <TableRow
                      key={String(row.id)}
                      className={
                        rowHasError
                          ? "bg-red-50"
                          : rowHasWarning
                          ? "bg-yellow-50"
                          : undefined
                      }
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
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3"
                                onClick={cancelEdit}
                              >
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
            <Button variant="outline" size="lg" className="h-12 px-8 text-lg" onClick={handleCancelImport}>
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
            <p className="text-lg text-muted-foreground">Data akan disimpan permanen setelah konfirmasi</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
