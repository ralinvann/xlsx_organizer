import ExcelJS from "exceljs";

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

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_PATTERNS: string[][] = [
  ["JANUARI","JANUARY","JAN"],
  ["FEBRUARI","FEBRUARY","FEB"],
  ["MARET","MARCH","MAR"],
  ["APRIL","APR"],
  ["MEI","MAY"],
  ["JUNI","JUNE","JUN"],
  ["JULI","JULY","JUL"],
  ["AGUSTUS","AUGUST","AGT","AGST","AGU"],
  ["SEPTEMBER","SEPT","SEP"],
  ["OKTOBER","OCTOBER","OKT","OCT"],
  ["NOVEMBER","NOV"],
  ["DESEMBER","DECEMBER","DES","DEC"],
];

const YES_VALUES = new Set(["yes","ya","v","✓","x","1","true","p"]);

// ─── Types ────────────────────────────────────────────────────────────────────
interface IndividualRecord { [key: string]: any }

interface WorksheetData {
  worksheetName: string;
  puskesmas: string;
  kabupaten: string;
  bulanTahun: string;
  headerKeys: string[];
  headerLabels: string[];
  rowData: IndividualRecord[];
  mergeRanges?: string[];
}

interface MonthlyReportPayload {
  kabupaten: string;
  bulanTahun: string;
  worksheets: WorksheetData[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normKey(k: string): string {
  return String(k)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findHK(headerKeys: string[], test: (n: string) => boolean): string | undefined {
  return headerKeys.find(k => test(normKey(k)));
}

function isMarked(v: any): boolean {
  if (v === null || v === undefined || v === "") return false;
  return YES_VALUES.has(String(v).trim().toLowerCase());
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
    let birthDate: Date | null = null;
    if (typeof v === "number" && isFinite(v)) {
      const epoch = new Date(1899, 11, 30);
      birthDate = new Date(epoch.getTime() + v * 86400000);
    } else if (typeof v === "string") {
      const parts = v.trim().split(/[\/\-\.]/);
      if (parts.length === 3) {
        const [a, b, c] = parts.map(Number);
        if (c > 1900) {
          const d = new Date(c, b - 1, a);
          if (!isNaN(d.getTime())) birthDate = d;
        } else {
          const d = new Date(a, b - 1, c);
          if (!isNaN(d.getTime())) birthDate = d;
        }
      }
    }
    if (birthDate && !isNaN(birthDate.getTime())) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      if (
        today.getMonth() < birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
      ) age--;
      return age >= 0 ? age : null;
    }
  }
  return null;
}

function getGender(record: IndividualRecord, headerKeys: string[]): "L" | "P" | null {
  const jkKey = findHK(headerKeys, n =>
    n === "jk" || n.includes("jeniskelamin") || n === "gender",
  );
  if (jkKey !== undefined) {
    const v = String(record[jkKey] ?? "").trim().toUpperCase();
    if (v === "L" || v === "LAKILAKI" || v.startsWith("L")) return "L";
    if (v === "P" || v === "PEREMPUAN" || v.startsWith("P")) return "P";
  }
  return null;
}

function getNIK(record: IndividualRecord, headerKeys: string[]): string {
  const nikKey = findHK(headerKeys, n => n === "nik" || n.includes("nik"));
  return nikKey ? String(record[nikKey] ?? "").trim() : "";
}

function getAlamat(record: IndividualRecord, headerKeys: string[]): string {
  const key = findHK(headerKeys, n =>
    n.includes("alamat") || n === "desa" || n === "address" || n === "village",
  );
  return key ? String(record[key] ?? "").trim().toUpperCase() : "";
}

// ─── Metrics computation ──────────────────────────────────────────────────────
interface DesaMetrics {
  sasaran: { praL: number; praP: number; lansiaL: number; lansiaP: number; ristiL: number; ristiP: number };
  yangDibina: { praL: number; praP: number; lansiaL: number; lansiaP: number; ristiL: number; ristiP: number };
  skriningLansia: { L: number; P: number };
  tkA: number;
  tkB: number;
  tkC: number;
  diberdayakan: number;
}

function computeDesaMetrics(rows: IndividualRecord[], headerKeys: string[]): DesaMetrics {
  const S: Record<string, Set<string>> = {
    praL: new Set(), praP: new Set(),
    lansiaL: new Set(), lansiaP: new Set(),
    ristiL: new Set(), ristiP: new Set(),
    dbPraL: new Set(), dbPraP: new Set(),
    dbLansiaL: new Set(), dbLansiaP: new Set(),
    dbRistiL: new Set(), dbRistiP: new Set(),
    skLansiaL: new Set(), skLansiaP: new Set(),
    tkA: new Set(), tkB: new Set(), tkC: new Set(),
    diberdayakan: new Set(),
  };

  const skriningKey   = findHK(headerKeys, n => n.includes("skrining"));
  const pengobatanKey = findHK(headerKeys, n => n.includes("pengobatan"));
  const penyuluhanKey = findHK(headerKeys, n => n.includes("penyuluhan"));
  const pemberdayaanKey = findHK(headerKeys, n => n.includes("pemberdayaan"));
  const tkAKey = findHK(headerKeys, n => n === "a");
  const tkBKey = findHK(headerKeys, n => n === "b");
  const tkCKey = findHK(headerKeys, n => n === "c");

  for (const rec of rows) {
    const age = getAge(rec, headerKeys);
    const gender = getGender(rec, headerKeys);
    const nik = getNIK(rec, headerKeys);
    if (age === null || gender === null || !nik) continue;

    const g = gender;

    if (age >= 45 && age < 60) {
      S[g === "L" ? "praL" : "praP"].add(nik);
    }
    if (age >= 60) {
      S[g === "L" ? "lansiaL" : "lansiaP"].add(nik);
    }
    if (age >= 70) {
      S[g === "L" ? "ristiL" : "ristiP"].add(nik);
    }

    const hasService =
      (skriningKey && isMarked(rec[skriningKey])) ||
      (pengobatanKey && isMarked(rec[pengobatanKey])) ||
      (penyuluhanKey && isMarked(rec[penyuluhanKey])) ||
      (pemberdayaanKey && isMarked(rec[pemberdayaanKey]));

    if (hasService) {
      if (age >= 45 && age < 60) S[g === "L" ? "dbPraL" : "dbPraP"].add(nik);
      if (age >= 60)             S[g === "L" ? "dbLansiaL" : "dbLansiaP"].add(nik);
      if (age >= 70)             S[g === "L" ? "dbRistiL" : "dbRistiP"].add(nik);
    }

    if (age >= 60 && skriningKey && isMarked(rec[skriningKey])) {
      S[g === "L" ? "skLansiaL" : "skLansiaP"].add(nik);
    }

    if (age >= 60) {
      if (tkAKey && isMarked(rec[tkAKey])) S.tkA.add(nik);
      if (tkBKey && isMarked(rec[tkBKey])) S.tkB.add(nik);
      if (tkCKey && isMarked(rec[tkCKey])) S.tkC.add(nik);
    }
    if (age >= 60 && pemberdayaanKey && isMarked(rec[pemberdayaanKey])) {
      S.diberdayakan.add(nik);
    }
  }

  const sz = (key: string) => S[key].size;
  return {
    sasaran:    { praL: sz("praL"),   praP: sz("praP"),    lansiaL: sz("lansiaL"),  lansiaP: sz("lansiaP"),  ristiL: sz("ristiL"),  ristiP: sz("ristiP")  },
    yangDibina: { praL: sz("dbPraL"), praP: sz("dbPraP"),  lansiaL: sz("dbLansiaL"), lansiaP: sz("dbLansiaP"), ristiL: sz("dbRistiL"), ristiP: sz("dbRistiP") },
    skriningLansia: { L: sz("skLansiaL"), P: sz("skLansiaP") },
    tkA: sz("tkA"), tkB: sz("tkB"), tkC: sz("tkC"),
    diberdayakan: sz("diberdayakan"),
  };
}

// ─── Row builders ─────────────────────────────────────────────────────────────
function pct(n: number, d: number): number {
  return d ? n / d : 0;
}

function svcGroup(bIL: number, bIP: number, sasL: number, sasP: number, sasT: number): number[] {
  const bIT = bIL + bIP;
  return [
    0, 0, 0,
    bIL, bIP, bIT,
    bIL, pct(bIL, sasL),
    bIP, pct(bIP, sasP),
    bIT, pct(bIT, sasT),
  ];
}

function tkGroup(n: number, total: number): number[] {
  return [0, n, n, pct(n, total)];
}

function buildDesaRow(no: number, desa: string, m: DesaMetrics): any[] {
  const { sasaran: s, yangDibina: d, skriningLansia: sk, tkA, tkB, tkC, diberdayakan } = m;
  const praT   = s.praL + s.praP;
  const lansT  = s.lansiaL + s.lansiaP;
  const ristiT = s.ristiL + s.ristiP;
  const total  = praT + lansT + ristiT;
  const lansTotal = lansT || 1;

  return [
    no, desa, 1, 1,
    s.praL,  s.praP,  praT,
    s.lansiaL, s.lansiaP, lansT,
    s.ristiL, s.ristiP, ristiT,
    total,
    ...svcGroup(d.praL,   d.praP,   s.praL,   s.praP,   praT),
    ...svcGroup(d.lansiaL, d.lansiaP, s.lansiaL, s.lansiaP, lansT),
    ...svcGroup(d.ristiL, d.ristiP,  s.ristiL,  s.ristiP,  ristiT),
    0, 0, 0, sk.L, sk.P, sk.L + sk.P,
    sk.L,  pct(sk.L, s.lansiaL),
    sk.P,  pct(sk.P, s.lansiaP),
    sk.L + sk.P, pct(sk.L + sk.P, lansT),
    ...tkGroup(tkA, lansTotal),
    ...tkGroup(tkB, lansTotal),
    ...tkGroup(tkC, lansTotal),
    ...tkGroup(diberdayakan, lansTotal),
  ];
}

function buildTotalRow(dataRows: any[][]): any[] {
  const NCOLS = 78;
  const row: any[] = [null, "TOTAL", dataRows.length, dataRows.length];
  for (let c = 4; c < NCOLS; c++) {
    let sum = 0;
    for (const dr of dataRows) {
      const v = dr[c];
      if (typeof v === "number" && isFinite(v)) sum += v;
    }
    row.push(sum);
  }
  return row;
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

const fill = (argb: string): ExcelJS.Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

const FILL_LAVENDER   = fill("FFCCCCFF");
const FILL_GREEN      = fill("FFCCFFCC");
const FILL_CYAN       = fill("FFCCFFFF");
const FILL_SILVER     = fill("FFC0C0C0");
const FILL_YELLOW     = fill("FFFFFF00");
const FILL_PRA_LP     = fill("FFCC99FF");
const FILL_PRA_T      = fill("FFCCCCFF");
const FILL_LANSIA_LP  = fill("FFFF99CC");
const FILL_LANSIA_T   = fill("FFFFFF99");
const FILL_RISTI_LP   = fill("FFCCCCFF");
const FILL_RISTI_T    = fill("FFFF99CC");

const COL_WIDTHS: number[] = [
  3,     // A - NO
  17.43, // B - DESA
  7.71,  // C - JML DESA
  8.14,  // D - JML POSYANDU
  10.57, 10.57, 10.57, 10.57, 10.57, 10.57, 10.57, 10.57, 10.57, 10.57,
  6.71, 6.71, 6.71, 6.71, 6.71, 6.71, 6.71, 6.71, 6.71, 6.71, 6.71, 6.71,
  5.43, 6, 5.43, 6.14, 6.43, 6.14, 6, 6.14, 5.71, 5.86, 5.14, 5.86,
  5.57, 6.29, 6.14, 5.43, 5.57, 5.71, 5.86, 5.71, 6, 6, 5.86, 5.71,
  5.57, 6.14, 6.14, 5.14, 5.71, 5.86, 5.71, 6.57, 6.71, 6.43, 6.29, 6.57,
  8.29, 8.29, 8.29, 8.29, 8.29, 8.29, 8.29, 8.29,
  8.29, 8.29, 8.29, 8.29, 8.29, 8.29, 8.29, 8.29,
];

function headerFill(c: number): ExcelJS.Fill {
  if (c <= 14) return FILL_LAVENDER;
  if (c <= 50) return FILL_GREEN;
  if (c <= 62) return FILL_CYAN;
  if (c <= 74) return FILL_GREEN;
  return FILL_SILVER;
}

function sasaranDataFill(c: number): ExcelJS.Fill | undefined {
  if (c === 5 || c === 6) return FILL_PRA_LP;
  if (c === 7) return FILL_PRA_T;
  if (c === 8 || c === 9) return FILL_LANSIA_LP;
  if (c === 10) return FILL_LANSIA_T;
  if (c === 11 || c === 12) return FILL_RISTI_LP;
  if (c === 13) return FILL_RISTI_T;
  return undefined;
}

// ─── Month parsing ────────────────────────────────────────────────────────────
function parseMonthYear(bulanTahun: string): { monthName: string; year: string } {
  const upper = bulanTahun.toUpperCase().trim();
  let monthName = "BULAN";
  for (const patterns of MONTH_PATTERNS) {
    if (patterns.some(p => upper.includes(p))) {
      monthName = patterns[0];
      break;
    }
  }
  const yearMatch = upper.match(/\d{4}/);
  const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
  return { monthName, year };
}

// ─── Desa ordering helper ─────────────────────────────────────────────────────
function sortDesaEntries<T>(entries: [string, T][]): [string, T][] {
  return entries.sort((a, b) => {
    const normA = normalizeDesa(a[0]);
    const normB = normalizeDesa(b[0]);
    const idxA = DESA_ORDER.findIndex(d => normalizeDesa(d) === normA);
    const idxB = DESA_ORDER.findIndex(d => normalizeDesa(d) === normB);
    const orderA = idxA >= 0 ? idxA : 999;
    const orderB = idxB >= 0 ? idxB : 999;
    if (orderA !== orderB) return orderA - orderB;
    return a[0].localeCompare(b[0]);
  });
}

// ─── Main generator ───────────────────────────────────────────────────────────
export async function generateMonthlyReportExcel(
  payload: MonthlyReportPayload
): Promise<Buffer> {
  const { kabupaten, bulanTahun, worksheets } = payload;
  const { monthName, year } = parseMonthYear(bulanTahun);

  const cleanKab  = kabupaten.replace(/^:\s*/, "").trim().toUpperCase();
  const cleanPusk = (worksheets[0]?.puskesmas || "-").replace(/^:\s*/, "").trim().toUpperCase();

  const wb = new ExcelJS.Workbook();
  const NC = 78;

  const ws = wb.addWorksheet(monthName);

  // ── Column widths ───────────────────────────────────────────────────────────
  ws.columns = COL_WIDTHS.map(w => ({ width: w }));

  // ── Merge all rows from all worksheets, group by desa ───────────────────────
  interface DesaGroup { records: IndividualRecord[]; headerKeys: string[] }
  const desaMap = new Map<string, DesaGroup>();

  for (const worksheet of worksheets) {
    const hk = worksheet.headerKeys;
    for (const rec of worksheet.rowData) {
      let desa = getAlamat(rec, hk);
      if (!desa) {
        desa = (worksheet.worksheetName || "").trim().toUpperCase() || "TIDAK DIKETAHUI";
      }
      if (!desaMap.has(desa)) {
        desaMap.set(desa, { records: [], headerKeys: hk });
      }
      desaMap.get(desa)!.records.push(rec);
    }
  }

  // ── Sort desa by custom order ───────────────────────────────────────────────
  const sortedEntries = sortDesaEntries([...desaMap.entries()]);

  // ── Build per-desa data rows ────────────────────────────────────────────────
  const dataRows: any[][] = [];
  let no = 1;
  for (const [desa, { records, headerKeys }] of sortedEntries) {
    const metrics = computeDesaMetrics(records, headerKeys);
    dataRows.push(buildDesaRow(no++, desa, metrics));
  }
  const totalRow = buildTotalRow(dataRows);

  // ── Row 2: Title ────────────────────────────────────────────────────────────
  ws.mergeCells(2, 2, 2, 21);
  const titleCell = ws.getCell(2, 2);
  titleCell.value = "LAPORAN PROGRAM PELAYANAN KESEHATAN LANJUT USIA";
  titleCell.font = TITLE_FONT;
  titleCell.alignment = { horizontal: "left", vertical: "middle" };

  // ── Row 4: KABUPATEN ────────────────────────────────────────────────────────
  ws.getCell(4, 2).value = "KABUPATEN"; ws.getCell(4, 2).font = META_FONT;
  ws.getCell(4, 3).value = ":";         ws.getCell(4, 3).font = META_FONT;
  ws.getCell(4, 4).value = cleanKab;    ws.getCell(4, 4).font = META_FONT;

  // ── Row 5: PUSKESMAS ───────────────────────────────────────────────────────
  ws.getCell(5, 2).value = "PUSKESMAS"; ws.getCell(5, 2).font = META_FONT;
  ws.getCell(5, 3).value = ":";         ws.getCell(5, 3).font = META_FONT;
  ws.getCell(5, 4).value = cleanPusk;   ws.getCell(5, 4).font = META_FONT;

  // ── Row 6: TAHUN ───────────────────────────────────────────────────────────
  ws.getCell(6, 2).value = "TAHUN"; ws.getCell(6, 2).font = META_FONT;
  ws.getCell(6, 3).value = ":";     ws.getCell(6, 3).font = META_FONT;
  ws.getCell(6, 4).value = year;    ws.getCell(6, 4).font = META_FONT;

  // ── Row 7: BULAN ───────────────────────────────────────────────────────────
  ws.getCell(7, 2).value = "BULAN";    ws.getCell(7, 2).font = META_FONT;
  ws.getCell(7, 3).value = ":";        ws.getCell(7, 3).font = META_FONT;
  ws.getCell(7, 4).value = monthName;  ws.getCell(7, 4).font = META_FONT;

  // ── Row heights ─────────────────────────────────────────────────────────────
  ws.getRow(8).height = 15;
  ws.getRow(9).height = 15;
  ws.getRow(10).height = 30;
  ws.getRow(11).height = 42.75;
  ws.getRow(12).height = 15;
  ws.getRow(13).height = 25;
  ws.getRow(14).height = 20;
  ws.getRow(15).height = 18;

  // ── Header rows 8-13 ───────────────────────────────────────────────────────
  const HR = 8;

  for (let r = HR; r <= HR + 5; r++) {
    for (let c = 1; c <= NC; c++) {
      const cell = ws.getCell(r, c);
      cell.font = HEADER_FONT;
      cell.alignment = HEADER_ALIGN;
      cell.border = THIN_BORDER;
      cell.fill = headerFill(c);
    }
  }

  const setH = (r: number, c: number, v: string) => {
    ws.getCell(r, c).value = v;
  };

  // ── HR (row 8): Top-level labels ────────────────────────────────────────────
  ws.mergeCells(HR, 1, HR + 5, 1);   setH(HR, 1, "NO.");
  ws.mergeCells(HR, 2, HR + 5, 2);   setH(HR, 2, "DESA");
  ws.mergeCells(HR, 3, HR + 5, 3);   setH(HR, 3, "JUMLAH DESA / KELURAHAN");
  ws.mergeCells(HR, 4, HR + 5, 4);   setH(HR, 4, "JUMLAH POSYANDU LANSIA");
  ws.mergeCells(HR, 5, HR, 13);       setH(HR, 5, "SASARAN");
  ws.mergeCells(HR, 14, HR + 5, 14); setH(HR, 14, "TOTAL SASARAN ");
  ws.mergeCells(HR, 15, HR, 78);      setH(HR, 15, "PELAYANAN KESEHATAN");

  // ── HR+1 (row 9): Category labels ──────────────────────────────────────────
  ws.mergeCells(HR + 1, 5, HR + 3, 7);   setH(HR + 1, 5, "Jumlah \nPra Lansia\n(45-59 tahun)");
  ws.mergeCells(HR + 1, 8, HR + 3, 10);  setH(HR + 1, 8, "Jumlah Lansia \n( \u2265 60 tahun) ");
  ws.mergeCells(HR + 1, 11, HR + 3, 13); setH(HR + 1, 11, "Jumlah Lansia Risti (\u2265 70 tahun)");

  ws.mergeCells(HR + 1, 15, HR + 1, 50); setH(HR + 1, 15, "Jumlah  yang dibina\n/ yang mendapat pelayanan kesehatan");
  ws.mergeCells(HR + 1, 51, HR + 2, 62); setH(HR + 1, 51, "Lansia (\u2265 60 tahun) yang diskrining kesehatan sesuai standar");
  ws.mergeCells(HR + 1, 63, HR + 1, 74); setH(HR + 1, 63, "Jumlah Lansia dengan \ntingkat kemandirian");
  ws.mergeCells(HR + 1, 75, HR + 2, 78); setH(HR + 1, 75, "Jumlah Lansia Yang Diberdayakan");

  // ── HR+2 (row 10): Sub-category labels ─────────────────────────────────────
  ws.mergeCells(HR + 2, 15, HR + 2, 26); setH(HR + 2, 15, "Pra Lansia\n(45-59 tahun)");
  ws.mergeCells(HR + 2, 27, HR + 2, 38); setH(HR + 2, 27, "Lansia\n(\u2265 60 tahun)");
  ws.mergeCells(HR + 2, 39, HR + 2, 50); setH(HR + 2, 39, "Lansia Risti\n(\u2265 70 tahun)");
  ws.mergeCells(HR + 2, 63, HR + 2, 66); setH(HR + 2, 63, "Tingkat Kemandirian A (Mandiri)");
  ws.mergeCells(HR + 2, 67, HR + 2, 70); setH(HR + 2, 67, "Tingkat Kemandirian B (Ketergantungan ringan/sedang)");
  ws.mergeCells(HR + 2, 71, HR + 2, 74); setH(HR + 2, 71, "Tingkat Kemandirian C (Ketergantungan Berat/Total)");

  // ── HR+3 (row 11): Bulan lalu / Bulan ini / Total ──────────────────────────
  for (const sc of [15, 27, 39, 51]) {
    ws.mergeCells(HR + 3, sc, HR + 3, sc + 2);      setH(HR + 3, sc, "Bulan lalu");
    ws.mergeCells(HR + 3, sc + 3, HR + 3, sc + 5);  setH(HR + 3, sc + 3, "Bulan ini");
    ws.mergeCells(HR + 3, sc + 6, HR + 3, sc + 11); setH(HR + 3, sc + 6, "Total");
  }

  ws.mergeCells(HR + 3, 63, HR + 3, 64); setH(HR + 3, 63, "Absolut");
  ws.mergeCells(HR + 3, 65, HR + 3, 66); setH(HR + 3, 65, "%");
  ws.mergeCells(HR + 3, 67, HR + 3, 68); setH(HR + 3, 67, "Absolut");
  ws.mergeCells(HR + 3, 69, HR + 3, 70); setH(HR + 3, 69, "%");
  ws.mergeCells(HR + 3, 71, HR + 3, 72); setH(HR + 3, 71, "Absolut");
  ws.mergeCells(HR + 3, 73, HR + 3, 74); setH(HR + 3, 73, "%");
  ws.mergeCells(HR + 3, 75, HR + 3, 76); setH(HR + 3, 75, "Absolut");

  // ── HR+4 (row 12): L / P / T + sub labels ──────────────────────────────────
  for (const c of [5, 6, 7, 8, 9, 10, 11, 12, 13]) {
    ws.mergeCells(HR + 4, c, HR + 5, c);
  }
  setH(HR + 4, 5, "L"); setH(HR + 4, 6, "P"); setH(HR + 4, 7, "T");
  setH(HR + 4, 8, "L"); setH(HR + 4, 9, "P"); setH(HR + 4, 10, "T");
  setH(HR + 4, 11, "L"); setH(HR + 4, 12, "P"); setH(HR + 4, 13, "T");

  for (const sc of [15, 27, 39, 51]) {
    setH(HR + 4, sc, "L"); setH(HR + 4, sc + 1, "P "); setH(HR + 4, sc + 2, "T");
    setH(HR + 4, sc + 3, "L"); setH(HR + 4, sc + 4, "P "); setH(HR + 4, sc + 5, "T");
    ws.mergeCells(HR + 4, sc + 6, HR + 4, sc + 7);   setH(HR + 4, sc + 6, "L");
    ws.mergeCells(HR + 4, sc + 8, HR + 4, sc + 9);   setH(HR + 4, sc + 8, "P ");
    ws.mergeCells(HR + 4, sc + 10, HR + 4, sc + 11); setH(HR + 4, sc + 10, "T");
  }

  setH(HR + 4, 63, "Bulan lalu"); setH(HR + 4, 64, "Bulan ini");
  setH(HR + 4, 65, "Total"); ws.mergeCells(HR + 4, 66, HR + 5, 66);
  setH(HR + 4, 67, "Bulan lalu"); setH(HR + 4, 68, "Bulan ini");
  setH(HR + 4, 69, "Total"); ws.mergeCells(HR + 4, 70, HR + 5, 70);
  setH(HR + 4, 71, "Bulan lalu"); setH(HR + 4, 72, "Bulan ini");
  setH(HR + 4, 73, "Total"); ws.mergeCells(HR + 4, 74, HR + 5, 74);
  setH(HR + 4, 75, "Bulan Lalu"); setH(HR + 4, 76, "Bulan Ini");
  setH(HR + 4, 77, "Total"); ws.mergeCells(HR + 4, 78, HR + 5, 78); setH(HR + 4, 78, "%");

  // ── HR+5 (row 13): Abs. / % ────────────────────────────────────────────────
  for (const sc of [15, 27, 39, 51]) {
    setH(HR + 5, sc, "Abs."); setH(HR + 5, sc + 1, "Abs."); setH(HR + 5, sc + 2, "Abs.");
    setH(HR + 5, sc + 3, "Abs."); setH(HR + 5, sc + 4, "Abs."); setH(HR + 5, sc + 5, "Abs.");
    setH(HR + 5, sc + 6, "Abs."); setH(HR + 5, sc + 7, "%");
    setH(HR + 5, sc + 8, "Abs."); setH(HR + 5, sc + 9, "%");
    setH(HR + 5, sc + 10, "Abs."); setH(HR + 5, sc + 11, "%");
  }

  // ── Column numbers row (HR+6 = row 14) ─────────────────────────────────────
  const numRow = HR + 6;
  for (let c = 1; c <= NC; c++) {
    const cell = ws.getCell(numRow, c);
    cell.value = c;
    cell.font = HEADER_FONT;
    cell.alignment = DATA_CENTER;
    cell.border = THIN_BORDER;
    cell.fill = FILL_YELLOW;
  }

  // ── Data rows ───────────────────────────────────────────────────────────────
  const dataStartRow = numRow + 1;
  for (let di = 0; di < dataRows.length; di++) {
    const dr = dataRows[di];
    const excelRow = dataStartRow + di;
    const row = ws.getRow(excelRow);
    row.height = 17.25;

    for (let ci = 0; ci < NC; ci++) {
      const c = ci + 1;
      const cell = row.getCell(c);
      cell.value = dr[ci] ?? null;
      cell.font = DATA_FONT;
      cell.alignment = DATA_CENTER;
      cell.border = THIN_BORDER;

      const sFill = sasaranDataFill(c);
      if (sFill) cell.fill = sFill;

      if (typeof dr[ci] === "number" && dr[ci] > 0 && dr[ci] < 1) {
        cell.numFmt = "0%";
      }
    }

    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
  }

  // ── Total row ───────────────────────────────────────────────────────────────
  const totalExcelRow = dataStartRow + dataRows.length;
  const tRow = ws.getRow(totalExcelRow);
  tRow.height = 17.25;
  for (let ci = 0; ci < NC; ci++) {
    const c = ci + 1;
    const cell = tRow.getCell(c);
    cell.value = totalRow[ci] ?? null;
    cell.font = { ...DATA_FONT, bold: true };
    cell.alignment = DATA_CENTER;
    cell.border = THIN_BORDER;

    const sFill = sasaranDataFill(c);
    if (sFill) cell.fill = sFill;

    if (typeof totalRow[ci] === "number" && totalRow[ci] > 0 && totalRow[ci] < 1) {
      cell.numFmt = "0%";
    }
  }
  tRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

  // ── Signature section ───────────────────────────────────────────────────────
  const sigStart = totalExcelRow + 2;
  ws.getCell(sigStart, 2).value = "Laporan bulanan";
  ws.getCell(sigStart, 2).font = META_FONT;

  ws.getCell(sigStart + 1, 72).value = `${cleanPusk}, ${monthName} ${year}`;
  ws.getCell(sigStart + 1, 72).font = META_FONT;

  ws.getCell(sigStart + 2, 3).value = "Mengetahui :";
  ws.getCell(sigStart + 2, 3).font = META_FONT;
  ws.getCell(sigStart + 2, 72).value = "Pemegang  Program Kesehatan Lansia :";
  ws.getCell(sigStart + 2, 72).font = META_FONT;

  ws.getCell(sigStart + 3, 3).value = `Kepala UPTD. Puskesmas ${cleanPusk}`;
  ws.getCell(sigStart + 3, 3).font = META_FONT;

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}