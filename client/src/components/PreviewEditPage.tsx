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
};

type PreviewEditPageProps = {
  initialData?: any[] | UploadPayload | null;
  onDone?: () => void;
  onCancel?: () => void;
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
        payloadOrArray.headerLabels ?? headerKeys.map((k: string) => String(k).toUpperCase());
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

  const validationResults = useMemo(() => {
    if (!rows) return { total: 0, valid: 0, warning: 0, error: 0 };

    let total = rows.length;
    let valid = 0;
    let warning = 0;
    let errorCount = 0;

    rows.forEach((r) => {
      // keep your old logic but do NOT assume "nama/nik/umur" always exist
      const hasName = r.nama !== undefined ? Boolean(String(r.nama).trim()) : true;
      const hasNik = r.nik !== undefined ? Boolean(String(r.nik).trim()) : true;
      const hasAge =
        r.umur !== undefined ? !(r.umur === null || r.umur === "" || Number.isNaN(Number(r.umur))) : true;

      if (!(hasName && hasNik && hasAge)) {
        errorCount += 1;
        return;
      }

      const bp = String(r.tekananDarah ?? "");
      const sugar = String(r.gulaDarah ?? "");
      const sys = bp.split("/")[0] ? parseInt(bp.split("/")[0].replace(/\D/g, ""), 10) : NaN;
      const sugarNum = parseInt(sugar.replace(/\D/g, ""), 10);

      if ((!Number.isNaN(sys) && sys >= 140) || (!Number.isNaN(sugarNum) && sugarNum >= 180)) {
        warning += 1;
      } else {
        valid += 1;
      }
    });

    return { total, valid, warning, error: errorCount };
  }, [rows]);

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
    } catch (e) {
      console.warn("sessionStorage remove failed", e);
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

      const { data } = await api.post("/elderly-reports", body); // IMPORTANT: no "/api" here
      if (!data?.reportId) throw new Error("Response tidak valid dari server.");

      setSuccessMsg("Data berhasil diimpor ke database.");
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
        <CardContent>
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
                <TableRow>
                  {headerKeys.map((key, i) => (
                    <TableHead key={key} className="text-lg">
                      {headerLabels[i] ?? key}
                    </TableHead>
                  ))}
                  {isEditing && <TableHead className="text-lg">Aksi</TableHead>}
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.map((row) => (
                  <TableRow key={String(row.id)}>
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
                          <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => startEdit(row)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
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
