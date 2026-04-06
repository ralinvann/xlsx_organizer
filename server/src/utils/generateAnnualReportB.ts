import * as XLSX from "xlsx";
import { findMonthIndex } from "./generateAnnualReportA";

// ─── Constants ────────────────────────────────────────────────────────────────
export const SHEET_NAMES_B = [
  "JAN","FEB","MARET","APRIL","MEI","JUNI",
  "JULI","AGUST","SEPT","OKT","NOP","DES",
];

const MONTH_DISPLAY = [
  "JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI",
  "JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER",
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface IndividualRecord { [key: string]: any }

export interface MonthSheetB {
  bulanTahun: string;
  puskesmas: string;
  rows: IndividualRecord[];
  headerKeys: string[];
}

export interface AnnualReportBInput {
  year: string;
  kabupaten: string;
  puskesmas: string;
  monthSheets: Array<MonthSheetB | null>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normKey(k: string): string {
  return String(k).toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function findHK(headerKeys: string[], test: (n: string) => boolean): string | undefined {
  return headerKeys.find(k => test(normKey(k)));
}

function isMarked(v: any): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  // Any present non-string value (number/boolean/object) is considered filled.
  return true;
}

function getAge(record: IndividualRecord, headerKeys: string[]): number | null {
  const umurKey = findHK(headerKeys, n => n === "umur" || n === "usia" || n === "age");
  if (umurKey !== undefined) {
    const v = record[umurKey];
    if (v !== null && v !== undefined) {
      const s = String(v).trim().replace(/\s*tahun.*/i, "");
      const n = parseFloat(s.replace(",", "."));
      if (!isNaN(n) && n >= 0) return Math.floor(n);
    }
  }
  const tglKey = findHK(headerKeys, n =>
    (n.includes("tanggal") && n.includes("lahir")) ||
    n === "tgllahir" || n === "birthdate" ||
    (n.includes("birth") && n.includes("date")),
  );
  if (tglKey !== undefined && record[tglKey]) {
    const v = record[tglKey];
    let bd: Date | null = null;
    if (typeof v === "number" && isFinite(v)) {
      bd = new Date(new Date(1899, 11, 30).getTime() + v * 86400000);
    } else if (typeof v === "string") {
      const p = v.trim().split(/[\/\-\.]/);
      if (p.length === 3) {
        const [a, b, c] = p.map(Number);
        bd = c > 1900 ? new Date(c, b - 1, a) : new Date(a, b - 1, c);
      }
    }
    if (bd && !isNaN(bd.getTime())) {
      const t = new Date();
      let age = t.getFullYear() - bd.getFullYear();
      if (t.getMonth() < bd.getMonth() || (t.getMonth() === bd.getMonth() && t.getDate() < bd.getDate())) age--;
      return age >= 0 ? age : null;
    }
  }
  return null;
}

function getGender(record: IndividualRecord, headerKeys: string[]): string {
  const jkKey = findHK(headerKeys, n => n === "jk" || n.includes("jeniskelamin") || n === "gender");
  if (jkKey !== undefined) {
    const v = String(record[jkKey] ?? "").trim().toUpperCase();
    if (v === "L" || v.startsWith("L")) return "L";
    if (v === "P" || v.startsWith("P")) return "P";
    return v;
  }
  return "";
}

function getNIK(record: IndividualRecord, headerKeys: string[]): string {
  const k = findHK(headerKeys, n => n === "nik" || n.includes("nik"));
  return k ? String(record[k] ?? "").trim() : "";
}

function getNama(record: IndividualRecord, headerKeys: string[]): string {
  const k = findHK(headerKeys, n => n.includes("nama") || n.includes("name"));
  return k ? String(record[k] ?? "").trim() : "";
}

function getAlamat(record: IndividualRecord, headerKeys: string[]): string {
  const k = findHK(headerKeys, n => n.includes("alamat") || n === "desa" || n === "address" || n === "village");
  return k ? String(record[k] ?? "").trim() : "";
}

/** Return the raw tanggalLahir value (number or formatted string) */
function getTanggalLahir(record: IndividualRecord, headerKeys: string[]): any {
  const k = findHK(headerKeys, n =>
    (n.includes("tanggal") && n.includes("lahir")) ||
    n === "tgllahir" || n === "birthdate" ||
    (n.includes("birth") && n.includes("date")),
  );
  if (!k) return null;
  const v = record[k];
  if (v === null || v === undefined || v === "") return null;
  // Keep numeric serial as-is; format string-type dates consistently
  if (typeof v === "number") {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + v * 86400000);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    }
  }
  return String(v).trim();
}

/** Normalize age display to just a number string */
function getAgeDisplay(record: IndividualRecord, headerKeys: string[]): any {
  const umurKey = findHK(headerKeys, n => n === "umur" || n === "usia" || n === "age");
  if (umurKey !== undefined) {
    const v = record[umurKey];
    if (v !== null && v !== undefined) {
      const s = String(v).trim();
      const clean = s.replace(/\s*tahun.*/i, "").trim();
      const n = parseFloat(clean.replace(",", "."));
      if (!isNaN(n)) return Math.floor(n);
      return s; // return as-is if can't parse
    }
  }
  // Fall back to computed age
  const age = getAge(record, headerKeys);
  return age !== null ? age : "";
}

// ─── Main generator ───────────────────────────────────────────────────────────
export function generateAnnualReportB(input: AnnualReportBInput): Buffer {
  const { year, kabupaten, puskesmas, monthSheets } = input;
  const cleanKab  = kabupaten.replace(/^:\s*/, "").trim().toUpperCase();
  const cleanPusk = puskesmas.replace(/^:\s*/, "").trim().toUpperCase();
  const wb = XLSX.utils.book_new();

  for (let m = 0; m < 12; m++) {
    const sheetData = monthSheets[m];
    const monthDisp = MONTH_DISPLAY[m];

    const skriningKey     = sheetData ? findHK(sheetData.headerKeys, n => n.includes("skrining")) : undefined;
    const pengobatanKey   = sheetData ? findHK(sheetData.headerKeys, n => n.includes("pengobatan")) : undefined;
    const penyuluhanKey   = sheetData ? findHK(sheetData.headerKeys, n => n.includes("penyuluhan")) : undefined;
    const pemberdayaanKey = sheetData ? findHK(sheetData.headerKeys, n => n.includes("pemberdayaan")) : undefined;
    const tkAKey = sheetData ? findHK(sheetData.headerKeys, n => n === "a") : undefined;
    const tkBKey = sheetData ? findHK(sheetData.headerKeys, n => n === "b") : undefined;
    const tkCKey = sheetData ? findHK(sheetData.headerKeys, n => n === "c") : undefined;

    // ── Build AOA ─────────────────────────────────────────────────────────────
    const NC = 18;
    const E = () => Array(NC).fill(null);
    const aoa: any[][] = [];

    // Row 0: Title (merged A1:J1 cols 0-9)
    const r0 = E();
    r0[0] = "LAPORAN BULANAN PELAYANAN LANJUT USIA";
    aoa.push(r0);

    // Row 1: KABUPATEN
    const r1 = E();
    r1[0] = "KABUPATEN "; r1[2] = `: ${cleanKab}`;
    aoa.push(r1);

    // Row 2: PUSKESMAS
    const r2 = E();
    r2[0] = "PUSKESMAS"; r2[2] = `: ${cleanPusk}`;
    aoa.push(r2);

    // Row 3: BULAN/TAHUN
    const r3 = E();
    r3[0] = "BULAN/ TAHUN"; r3[2] = `: ${monthDisp}/ ${year}`;
    aoa.push(r3);

    // Row 4: blank
    aoa.push(E());

    // ── Header rows 5-8 ───────────────────────────────────────────────────────
    const h1 = E();
    h1[0]  = "NO";
    h1[1]  = "NAMA LANSIA";
    h1[2]  = "TANGGAL LAHIR";
    h1[3]  = "UMUR";
    h1[4]  = "JK";
    h1[5]  = "NIK";
    h1[6]  = "ALAMAT";
    h1[7]  = "JENIS PELAYANAN YANG DIBERIKAN";
    aoa.push(h1); // index 5

    const h2 = E();
    h2[7]  = "USIA >60 TAHUN";
    h2[14] = "USIA >70 TAHUN RESIKO TINGGI";
    aoa.push(h2); // index 6

    const h3 = E();
    h3[7]  = "SKRINING ";
    h3[8]  = "PENGOBATAN";
    h3[9]  = "PENYULUHAN ";
    h3[10] = "PEMBERDAYAAN";
    h3[11] = "TINGKAT KEMANDIRIAN ";
    h3[14] = "SKRINING ";
    h3[15] = "PENGOBATAN";
    h3[16] = "PENYULUHAN ";
    h3[17] = "PEMBERDAYAAN";
    aoa.push(h3); // index 7

    const h4 = E();
    h4[11] = "A"; h4[12] = "B"; h4[13] = "C";
    aoa.push(h4); // index 8

    // ── Data rows ─────────────────────────────────────────────────────────────
    if (sheetData && sheetData.rows.length > 0) {
      // Sort: by street/desa, then name
      const sorted = [...sheetData.rows].sort((a, b) => {
        const da = getAlamat(a, sheetData.headerKeys);
        const db = getAlamat(b, sheetData.headerKeys);
        if (da < db) return -1;
        if (da > db) return 1;
        const na = getNama(a, sheetData.headerKeys).toLowerCase();
        const nb = getNama(b, sheetData.headerKeys).toLowerCase();
        return na < nb ? -1 : na > nb ? 1 : 0;
      });

      let rowNo = 1;
      for (const rec of sorted) {
        const age    = getAge(rec, sheetData.headerKeys);
        const gender = getGender(rec, sheetData.headerKeys);
        const nik    = getNIK(rec, sheetData.headerKeys);
        const nama   = getNama(rec, sheetData.headerKeys);
        const alamat = getAlamat(rec, sheetData.headerKeys);
        const tgl    = getTanggalLahir(rec, sheetData.headerKeys);
        const umur   = getAgeDisplay(rec, sheetData.headerKeys);

        const CHECK = "\u221A"; // √

        // Service flags
        const gotSkrining   = skriningKey     ? isMarked(rec[skriningKey])     : false;
        const gotPengobatan = pengobatanKey   ? isMarked(rec[pengobatanKey])   : false;
        const gotPenyuluhan = penyuluhanKey   ? isMarked(rec[penyuluhanKey])   : false;
        const gotPemberdayaan = pemberdayaanKey ? isMarked(rec[pemberdayaanKey]) : false;
        const gotTkA = tkAKey ? isMarked(rec[tkAKey]) : false;
        const gotTkB = tkBKey ? isMarked(rec[tkBKey]) : false;
        const gotTkC = tkCKey ? isMarked(rec[tkCKey]) : false;

        const isRisti = age !== null && age >= 70;

        const row = E();
        row[0] = rowNo++;
        row[1] = nama;
        row[2] = tgl ?? "";
        row[3] = umur;
        row[4] = gender || "";
        row[5] = nik;
        row[6] = alamat;

        if (isRisti) {
          // Risti: services in cols 14-17
          row[14] = gotSkrining   ? CHECK : null;
          row[15] = gotPengobatan ? CHECK : null;
          row[16] = gotPenyuluhan ? CHECK : null;
          row[17] = gotPemberdayaan ? CHECK : null;
        } else if (age !== null && age >= 60) {
          // Regular lansia >=60: services in cols 7-10
          row[7]  = gotSkrining   ? CHECK : null;
          row[8]  = gotPengobatan ? CHECK : null;
          row[9]  = gotPenyuluhan ? CHECK : null;
          row[10] = gotPemberdayaan ? CHECK : null;
        }

        // Tingkat kemandirian (cols 11-13) for all >=60
        if (age !== null && age >= 60) {
          row[11] = gotTkA ? CHECK : null;
          row[12] = gotTkB ? CHECK : null;
          row[13] = gotTkC ? CHECK : null;
        }

        aoa.push(row);
      }
    }

    // ── Worksheet ─────────────────────────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = [
      { wch: 5  }, // NO
      { wch: 24 }, // NAMA
      { wch: 14 }, // TGL LAHIR
      { wch: 6  }, // UMUR
      { wch: 5  }, // JK
      { wch: 18 }, // NIK
      { wch: 16 }, // ALAMAT
      { wch: 8  }, { wch: 10 }, { wch: 10 }, { wch: 12 }, // cols 7-10
      { wch: 5  }, { wch: 5  }, { wch: 5  },               // TK A/B/C
      { wch: 8  }, { wch: 10 }, { wch: 10 }, { wch: 12 }, // risti 14-17
    ];

    ws["!rows"] = [
      { hpx: 20 }, { hpx: 15 }, { hpx: 15 }, { hpx: 15 }, { hpx: 10 },
      { hpx: 35 }, { hpx: 30 }, { hpx: 30 }, { hpx: 20 },
    ];

    // ── Merges ────────────────────────────────────────────────────────────────
    const merges: XLSX.Range[] = [
      // Title row
      { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
      // Metadata label merges
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      // Fixed header cols span rows 5-8 (indices 5-8)
      { s: { r: 5, c: 0  }, e: { r: 8, c: 0  } }, // NO
      { s: { r: 5, c: 1  }, e: { r: 8, c: 1  } }, // NAMA
      { s: { r: 5, c: 2  }, e: { r: 8, c: 2  } }, // TGL LAHIR
      { s: { r: 5, c: 3  }, e: { r: 8, c: 3  } }, // UMUR
      { s: { r: 5, c: 4  }, e: { r: 8, c: 4  } }, // JK
      { s: { r: 5, c: 5  }, e: { r: 8, c: 5  } }, // NIK
      { s: { r: 5, c: 6  }, e: { r: 8, c: 6  } }, // ALAMAT
      // "JENIS PELAYANAN" spanning cols 7-17, row 5
      { s: { r: 5, c: 7  }, e: { r: 5, c: 17 } },
      // >=60 group (row 6, cols 7-13)
      { s: { r: 6, c: 7  }, e: { r: 6, c: 13 } },
      // >=70 risti group (row 6, cols 14-17)
      { s: { r: 6, c: 14 }, e: { r: 6, c: 17 } },
      // Service column headers span rows 7-8 (single cells becoming 2-row)
      { s: { r: 7, c: 7  }, e: { r: 8, c: 7  } }, // SKRINING
      { s: { r: 7, c: 8  }, e: { r: 8, c: 8  } }, // PENGOBATAN
      { s: { r: 7, c: 9  }, e: { r: 8, c: 9  } }, // PENYULUHAN
      { s: { r: 7, c: 10 }, e: { r: 8, c: 10 } }, // PEMBERDAYAAN
      // TINGKAT KEMANDIRIAN spans cols 11-13, row 7
      { s: { r: 7, c: 11 }, e: { r: 7, c: 13 } },
      // Risti service cols span rows 7-8
      { s: { r: 7, c: 14 }, e: { r: 8, c: 14 } },
      { s: { r: 7, c: 15 }, e: { r: 8, c: 15 } },
      { s: { r: 7, c: 16 }, e: { r: 8, c: 16 } },
      { s: { r: 7, c: 17 }, e: { r: 8, c: 17 } },
    ];

    ws["!merges"] = merges;
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAMES_B[m]);
  }

  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export { findMonthIndex };
