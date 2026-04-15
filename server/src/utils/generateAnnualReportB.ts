import ExcelJS from "exceljs";
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
  return true;
}

// ─── Custom desa/kelurahan ordering ───────────────────────────────────────────
const DESA_ORDER: string[] = [
  "LAE NUAHA",
  "SUNGAI RAYA",
  "KUTA TENGAH",
  "TAMBAHAN",
  "GUNUNG CERIA",
  "SIGAMBIR GAMBIR",
  "SILUMBOYAH",
  "PANGARIBUAN",
  "BAKAL JULU",
  "SIPOLTONG",
  "PANDAN",
  "TUALANG",
];

function normalizeDesa(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
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

function getTanggalLahir(record: IndividualRecord, headerKeys: string[]): any {
  const k = findHK(headerKeys, n =>
    (n.includes("tanggal") && n.includes("lahir")) ||
    n === "tgllahir" || n === "birthdate" ||
    (n.includes("birth") && n.includes("date")),
  );
  if (!k) return null;
  const v = record[k];
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + v * 86400000);
    if (!isNaN(d.getTime())) {
      return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
    }
  }
  return String(v).trim();
}

function getAgeDisplay(record: IndividualRecord, headerKeys: string[]): any {
  const umurKey = findHK(headerKeys, n => n === "umur" || n === "usia" || n === "age");
  if (umurKey !== undefined) {
    const v = record[umurKey];
    if (v !== null && v !== undefined) {
      const s = String(v).trim();
      const clean = s.replace(/\s*tahun.*/i, "").trim();
      const n = parseFloat(clean.replace(",", "."));
      if (!isNaN(n)) return Math.floor(n);
      return s;
    }
  }
  const age = getAge(record, headerKeys);
  return age !== null ? age : "";
}

// ─── Style constants ──────────────────────────────────────────────────────────
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" },
  left: { style: "thin" },
  bottom: { style: "thin" },
  right: { style: "thin" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, size: 10, name: "Arial" };
const DATA_FONT: Partial<ExcelJS.Font> = { size: 10, name: "Arial" };
const TITLE_FONT: Partial<ExcelJS.Font> = { bold: true, size: 12, name: "Arial" };
const META_FONT: Partial<ExcelJS.Font> = { size: 11, name: "Arial" };

const HEADER_ALIGN: Partial<ExcelJS.Alignment> = {
  horizontal: "center",
  vertical: "middle",
  wrapText: true,
};

const DATA_CENTER: Partial<ExcelJS.Alignment> = {
  horizontal: "center",
  vertical: "middle",
};

const DATA_LEFT: Partial<ExcelJS.Alignment> = {
  horizontal: "left",
  vertical: "middle",
};

const WHITE_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFFFF" },
};

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generateAnnualReportB(input: AnnualReportBInput): Promise<Buffer> {
  const { year, kabupaten, puskesmas, monthSheets } = input;
  const cleanKab  = kabupaten.replace(/^:\s*/, "").trim().toUpperCase();
  const cleanPusk = puskesmas.replace(/^:\s*/, "").trim().toUpperCase();
  const wb = new ExcelJS.Workbook();

  for (let m = 0; m < 12; m++) {
    const sheetData = monthSheets[m];
    const monthDisp = MONTH_DISPLAY[m];
    const ws = wb.addWorksheet(SHEET_NAMES_B[m]);

    // ── Column widths ─────────────────────────────────────────────────────────
    ws.columns = [
      { width: 4.17 },   // A - NO
      { width: 27.17 },  // B - NAMA
      { width: 10.5 },   // C - TGL LAHIR
      { width: 7.17 },   // D - UMUR
      { width: 6.67 },   // E - JK
      { width: 16 },     // F - NIK
      { width: 18.5 },   // G - ALAMAT
      { width: 8.67 },   // H - SKRINING
      { width: 12.83 },  // I - PENGOBATAN
      { width: 12.5 },   // J - PENYULUHAN
      { width: 14.67 },  // K - PEMBERDAYAAN
      { width: 8.33 },   // L - TK A
      { width: 8.33 },   // M - TK B
      { width: 8.33 },   // N - TK C
      { width: 9.67 },   // O - SKRINING (risti)
      { width: 13.83 },  // P - PENGOBATAN (risti)
      { width: 12 },     // Q - PENYULUHAN (risti)
      { width: 14.67 },  // R - PEMBERDAYAAN (risti)
    ];

    // ── Row 1: Title ──────────────────────────────────────────────────────────
    ws.mergeCells("A1:J1");
    const titleCell = ws.getCell("A1");
    titleCell.value = "LAPORAN BULANAN PELAYANAN LANJUT USIA";
    titleCell.font = TITLE_FONT;
    titleCell.alignment = { horizontal: "left", vertical: "middle" };

    // ── Row 2: KABUPATEN ──────────────────────────────────────────────────────
    ws.mergeCells("A2:B2");
    ws.getCell("A2").value = "KABUPATEN ";
    ws.getCell("A2").font = META_FONT;
    ws.getCell("C2").value = `: ${cleanKab}`;
    ws.getCell("C2").font = META_FONT;

    // ── Row 3: PUSKESMAS ──────────────────────────────────────────────────────
    ws.mergeCells("A3:B3");
    ws.getCell("A3").value = "PUSKESMAS";
    ws.getCell("A3").font = META_FONT;
    ws.getCell("C3").value = `: ${cleanPusk}`;
    ws.getCell("C3").font = META_FONT;

    // ── Row 4: BULAN/TAHUN ────────────────────────────────────────────────────
    ws.mergeCells("A4:B4");
    ws.getCell("A4").value = "BULAN/ TAHUN";
    ws.getCell("A4").font = META_FONT;
    ws.getCell("C4").value = `: ${monthDisp}/ ${year}`;
    ws.getCell("C4").font = META_FONT;

    // ── Row 5: blank spacer ───────────────────────────────────────────────────
    ws.getRow(5).height = 15;

    // ── Header rows 6-9 ──────────────────────────────────────────────────────
    const setH = (ref: string, value: string) => {
      const cell = ws.getCell(ref);
      cell.value = value;
      cell.font = HEADER_FONT;
      cell.alignment = HEADER_ALIGN;
      cell.border = THIN_BORDER;
    };

    // Pre-fill all header cells with border
    for (let r = 6; r <= 9; r++) {
      for (let c = 1; c <= 18; c++) {
        const cell = ws.getCell(r, c);
        cell.font = HEADER_FONT;
        cell.alignment = HEADER_ALIGN;
        cell.border = THIN_BORDER;
      }
    }

    // Fixed column headers (span rows 6-9)
    ws.mergeCells("A6:A9");  setH("A6", "NO");
    ws.mergeCells("B6:B9");  setH("B6", "NAMA LANSIA");
    ws.mergeCells("C6:C9");  setH("C6", "TANGGAL LAHIR");
    ws.mergeCells("D6:D9");  setH("D6", "UMUR");
    ws.mergeCells("E6:E9");  setH("E6", "JK");
    ws.mergeCells("F6:F9");  setH("F6", "NIK");
    ws.mergeCells("G6:G9");  setH("G6", "ALAMAT");

    // JENIS PELAYANAN (row 6, H-R)
    ws.mergeCells("H6:R6");
    setH("H6", "JENIS PELAYANAN YANG DIBERIKAN");

    // Age group headers (row 7)
    ws.mergeCells("H7:N7");
    setH("H7", "USIA >60 TAHUN");
    ws.mergeCells("O7:R7");
    setH("O7", "USIA >70 TAHUN RESIKO TINGGI");

    // Service column headers (rows 8-9)
    ws.mergeCells("H8:H9");  setH("H8", "SKRINING ");
    ws.mergeCells("I8:I9");  setH("I8", "PENGOBATAN");
    ws.mergeCells("J8:J9");  setH("J8", "PENYULUHAN ");
    ws.mergeCells("K8:K9");  setH("K8", "PEMBERDAYAAN");
    ws.mergeCells("L8:N8");  setH("L8", "TINGKAT KEMANDIRIAN ");
    setH("L9", "A");
    setH("M9", "B");
    setH("N9", "C");
    ws.mergeCells("O8:O9");  setH("O8", "SKRINING ");
    ws.mergeCells("P8:P9");  setH("P8", "PENGOBATAN");
    ws.mergeCells("Q8:Q9");  setH("Q8", "PENYULUHAN ");
    ws.mergeCells("R8:R9");  setH("R8", "PEMBERDAYAAN");

    // ── Data rows ─────────────────────────────────────────────────────────────
    const skriningKey     = sheetData ? findHK(sheetData.headerKeys, n => n.includes("skrining")) : undefined;
    const pengobatanKey   = sheetData ? findHK(sheetData.headerKeys, n => n.includes("pengobatan")) : undefined;
    const penyuluhanKey   = sheetData ? findHK(sheetData.headerKeys, n => n.includes("penyuluhan")) : undefined;
    const pemberdayaanKey = sheetData ? findHK(sheetData.headerKeys, n => n.includes("pemberdayaan")) : undefined;
    const tkAKey = sheetData ? findHK(sheetData.headerKeys, n => n === "a") : undefined;
    const tkBKey = sheetData ? findHK(sheetData.headerKeys, n => n === "b") : undefined;
    const tkCKey = sheetData ? findHK(sheetData.headerKeys, n => n === "c") : undefined;

    if (sheetData && sheetData.rows.length > 0) {
      const sorted = [...sheetData.rows].sort((a, b) => {
        const da = normalizeDesa(getAlamat(a, sheetData.headerKeys));
        const db = normalizeDesa(getAlamat(b, sheetData.headerKeys));
        const idxA = DESA_ORDER.findIndex(d => normalizeDesa(d) === da);
        const idxB = DESA_ORDER.findIndex(d => normalizeDesa(d) === db);
        const orderA = idxA >= 0 ? idxA : 999;
        const orderB = idxB >= 0 ? idxB : 999;
        if (orderA !== orderB) return orderA - orderB;
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

        const gotSkrining     = skriningKey     ? isMarked(rec[skriningKey])     : false;
        const gotPengobatan   = pengobatanKey   ? isMarked(rec[pengobatanKey])   : false;
        const gotPenyuluhan   = penyuluhanKey   ? isMarked(rec[penyuluhanKey])   : false;
        const gotPemberdayaan = pemberdayaanKey ? isMarked(rec[pemberdayaanKey]) : false;
        const gotTkA = tkAKey ? isMarked(rec[tkAKey]) : false;
        const gotTkB = tkBKey ? isMarked(rec[tkBKey]) : false;
        const gotTkC = tkCKey ? isMarked(rec[tkCKey]) : false;

        const isRisti = age !== null && age >= 70;
        const excelRow = 9 + rowNo; // data starts at row 10
        const row = ws.getRow(excelRow);
        row.height = 16.5;

        // Set all 18 cols with border + white fill
        for (let c = 1; c <= 18; c++) {
          const cell = row.getCell(c);
          cell.font = DATA_FONT;
          cell.border = THIN_BORDER;
          cell.fill = WHITE_FILL;
          cell.alignment = DATA_CENTER;
        }

        // Override alignment for text columns
        row.getCell(2).alignment = DATA_LEFT;  // NAMA
        row.getCell(6).alignment = DATA_LEFT;  // NIK
        row.getCell(7).alignment = DATA_LEFT;  // ALAMAT

        // Set values
        row.getCell(1).value = rowNo;        // A - NO
        row.getCell(2).value = nama;          // B - NAMA
        row.getCell(3).value = tgl ?? "";     // C - TGL LAHIR
        row.getCell(4).value = umur;          // D - UMUR
        row.getCell(5).value = gender || "";  // E - JK
        row.getCell(6).value = nik;           // F - NIK
        row.getCell(7).value = alamat;        // G - ALAMAT

        if (isRisti) {
          if (gotSkrining)     row.getCell(15).value = CHECK;
          if (gotPengobatan)   row.getCell(16).value = CHECK;
          if (gotPenyuluhan)   row.getCell(17).value = CHECK;
          if (gotPemberdayaan) row.getCell(18).value = CHECK;
        } else if (age !== null && age >= 60) {
          if (gotSkrining)     row.getCell(8).value = CHECK;
          if (gotPengobatan)   row.getCell(9).value = CHECK;
          if (gotPenyuluhan)   row.getCell(10).value = CHECK;
          if (gotPemberdayaan) row.getCell(11).value = CHECK;
        }

        if (age !== null && age >= 60) {
          if (gotTkA) row.getCell(12).value = CHECK;
          if (gotTkB) row.getCell(13).value = CHECK;
          if (gotTkC) row.getCell(14).value = CHECK;
        }

        rowNo++;
      }
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export { findMonthIndex };
