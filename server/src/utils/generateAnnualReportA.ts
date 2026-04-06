import * as XLSX from "xlsx";

// ─── Constants ────────────────────────────────────────────────────────────────
const SHEET_NAMES = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agst","Sept","Okto","Nov","Des",
];

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

export interface MonthSheet {
  bulanTahun: string;
  puskesmas: string;
  rows: IndividualRecord[];
  headerKeys: string[];
}

export interface AnnualReportAInput {
  year: string;
  kabupaten: string;
  puskesmas: string;
  /** 12-element array; index 0 = Januari…index 11 = Desember. null = no data. */
  monthSheets: Array<MonthSheet | null>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function normKey(k: string): string {
  return String(k)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findHK(
  headerKeys: string[],
  test: (n: string) => boolean,
): string | undefined {
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
    n === "tgllahir" ||
    n === "birthdate" ||
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

    const g = gender; // "L" | "P"

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

// 12-column pelayanan pattern
function svcGroup(bIL: number, bIP: number, sasL: number, sasP: number, sasT: number): any[] {
  const bIT = bIL + bIP;
  return [
    0, 0, 0,           // bulan lalu L, P, T
    bIL, bIP, bIT,     // bulan ini  L, P, T
    bIL, pct(bIL, sasL),   // total L, L%
    bIP, pct(bIP, sasP),   // total P, P%
    bIT, pct(bIT, sasT),   // total T, T%
  ];
}

// 4-column TK / diberdayakan pattern
function tkGroup(n: number, total: number): any[] {
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

// ─── Main generator ───────────────────────────────────────────────────────────
export function generateAnnualReportA(input: AnnualReportAInput): Buffer {
  const { year, kabupaten, puskesmas, monthSheets } = input;
  const cleanKab  = kabupaten.replace(/^:\s*/, "").trim().toUpperCase();
  const cleanPusk = puskesmas.replace(/^:\s*/, "").trim().toUpperCase();
  const wb = XLSX.utils.book_new();

  for (let m = 0; m < 12; m++) {
    const sheetData = monthSheets[m];
    const fullMonthName = MONTH_PATTERNS[m][0];

    // ── Build per-desa data rows ──────────────────────────────────────────────
    const desaMap = new Map<string, IndividualRecord[]>();
    if (sheetData && sheetData.rows.length > 0) {
      for (const rec of sheetData.rows) {
        const desa = getAlamat(rec, sheetData.headerKeys) || "TIDAK DIKETAHUI";
        if (!desaMap.has(desa)) desaMap.set(desa, []);
        desaMap.get(desa)!.push(rec);
      }
    }

    const dataRows: any[][] = [];
    let no = 1;
    for (const [desa, rows] of desaMap.entries()) {
      const metrics = computeDesaMetrics(rows, sheetData!.headerKeys);
      dataRows.push(buildDesaRow(no++, desa, metrics));
    }
    const totalRow = buildTotalRow(dataRows);

    // ── Build AOA ─────────────────────────────────────────────────────────────
    const N = 78;
    const E = () => Array(N).fill(null);
    const aoa: any[][] = [];

    // Row 0: blank
    aoa.push(E());

    // Row 1: title
    const r1 = E(); r1[1] = "LAPORAN PROGRAM PELAYANAN KESEHATAN LANJUT USIA";
    aoa.push(r1);

    // Row 2: blank
    aoa.push(E());

    // Row 3: KABUPATEN
    const r3 = E(); r3[1] = "KABUPATEN"; r3[2] = ":"; r3[3] = cleanKab;
    aoa.push(r3);

    // Row 4: PUSKESMAS
    const r4 = E(); r4[1] = "PUSKESMAS"; r4[2] = ":"; r4[3] = cleanPusk;
    aoa.push(r4);

    // Row 5: TAHUN
    const r5 = E(); r5[1] = "TAHUN"; r5[2] = ":"; r5[3] = year;
    aoa.push(r5);

    // Row 6: BULAN
    const r6 = E(); r6[1] = "BULAN"; r6[2] = ":"; r6[3] = fullMonthName;
    aoa.push(r6);

    // Row 7: blank
    aoa.push(E());

    // ── Header row 7 (index 8): top-level labels ──────────────────────────────
    const h1 = E();
    h1[0]  = "NO.";
    h1[1]  = "DESA";
    h1[2]  = "JUMLAH DESA / KELURAHAN";
    h1[3]  = "JUMLAH POSYANDU LANSIA";
    h1[4]  = "SASARAN";
    h1[13] = "TOTAL SASARAN";
    h1[14] = "PELAYANAN KESEHATAN";
    aoa.push(h1); // index 8

    // ── Header row 8 (index 9): category labels ───────────────────────────────
    const h2 = E();
    h2[4]  = "Jumlah \nPra Lansia\n(45-59 tahun)";
    h2[7]  = "Jumlah Lansia \n( \u2265 60 tahun) ";
    h2[10] = "Jumlah Lansia Risti (\u2265 70 tahun)";
    h2[14] = "Jumlah  yang dibina\n/ yang mendapat pelayanan kesehatan";
    h2[50] = "Lansia (\u2265 60 tahun) yang diskrining kesehatan sesuai standar";
    h2[62] = "Jumlah Lansia dengan \ntingkat kemandirian";
    h2[74] = "Jumlah Lansia Yang Diberdayakan";
    aoa.push(h2); // index 9

    // ── Header row 9 (index 10): sub-category labels ──────────────────────────
    const h3 = E();
    h3[14] = "Pra Lansia\n(45-59 tahun)";
    h3[26] = "Lansia\n(\u2265 60 tahun)";
    h3[38] = "Lansia Risti\n(\u2265 70 tahun)";
    h3[62] = "Tingkat Kemandirian A (Mandiri)";
    h3[66] = "Tingkat Kemandirian B (Ketergantungan ringan/sedang)";
    h3[70] = "Tingkat Kemandirian C (Ketergantungan Berat/Total)";
    aoa.push(h3); // index 10

    // ── Header row 10 (index 11): Bulan lalu / Bulan ini / Total ─────────────
    const h4 = E();
    for (const sc of [14, 26, 38, 50]) {
      h4[sc]     = "Bulan lalu";
      h4[sc + 3] = "Bulan ini";
      h4[sc + 6] = "Total";
    }
    aoa.push(h4); // index 11

    // ── Header row 11 (index 12): L / P / T + TK labels ──────────────────────
    const h5 = E();
    // Sasaran
    h5[4]  = "L"; h5[5]  = "P"; h5[6]  = "T";
    h5[7]  = "L"; h5[8]  = "P"; h5[9]  = "T";
    h5[10] = "L"; h5[11] = "P"; h5[12] = "T";
    // Pelayanan
    for (const sc of [14, 26, 38, 50]) {
      h5[sc]    = "L"; h5[sc+1]  = "P"; h5[sc+2]  = "T"; // bulan lalu
      h5[sc+3]  = "L"; h5[sc+4]  = "P"; h5[sc+5]  = "T"; // bulan ini
      h5[sc+6]  = "L"; h5[sc+8]  = "P"; h5[sc+10] = "T"; // total
    }
    // TK
    h5[62] = "Bulan lalu"; h5[63] = "Bulan ini"; h5[64] = "Total"; h5[65] = "%";
    h5[66] = "Bulan lalu"; h5[67] = "Bulan ini"; h5[68] = "Total"; h5[69] = "%";
    h5[70] = "Bulan lalu"; h5[71] = "Bulan ini"; h5[72] = "Total"; h5[73] = "%";
    h5[74] = "Bulan Lalu"; h5[75] = "Bulan Ini"; h5[76] = "Total"; h5[77] = "%";
    aoa.push(h5); // index 12

    // ── Header row 12 (index 13): Abs. / % ───────────────────────────────────
    const h6 = E();
    for (const c of [4,5,6,7,8,9,10,11,12]) h6[c] = "Abs.";
    for (const sc of [14, 26, 38, 50]) {
      h6[sc]=h6[sc+1]=h6[sc+2]="Abs.";         // bulan lalu
      h6[sc+3]=h6[sc+4]=h6[sc+5]="Abs.";       // bulan ini
      h6[sc+6]="Abs."; h6[sc+7]="%";
      h6[sc+8]="Abs."; h6[sc+9]="%";
      h6[sc+10]="Abs."; h6[sc+11]="%";          // total L/P/T with %
    }
    aoa.push(h6); // index 13

    // ── Column numbers row (index 14) ─────────────────────────────────────────
    aoa.push(Array.from({ length: N }, (_, i) => i + 1)); // index 14

    // ── Data rows ─────────────────────────────────────────────────────────────
    for (const dr of dataRows) aoa.push(dr);
    aoa.push(totalRow);

    // ── Signature section ─────────────────────────────────────────────────────
    aoa.push(E());
    const sigDate = E(); sigDate[1] = "Laporan bulanan";
    aoa.push(sigDate);
    const sigPlace = E();
    sigPlace[71] = `${cleanPusk}, ${fullMonthName} ${year}`;
    aoa.push(sigPlace);
    const sigMengetahui = E(); sigMengetahui[2] = "Mengetahui :";
    sigMengetahui[71] = "Pemegang  Program Kesehatan Lansia :";
    aoa.push(sigMengetahui);
    const sigKepala = E(); sigKepala[2] = `Kepala UPTD. Puskesmas ${cleanPusk}`;
    aoa.push(sigKepala);
    aoa.push(E()); aoa.push(E()); aoa.push(E()); aoa.push(E());

    // ── Worksheet ─────────────────────────────────────────────────────────────
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = [
      { wch: 5  }, // col 0: NO
      { wch: 22 }, // col 1: DESA
      { wch: 10 }, // col 2
      { wch: 10 }, // col 3
      ...Array(74).fill({ wch: 8 }),
    ];

    ws["!rows"] = [
      { hpx: 12 }, { hpx: 25 }, { hpx: 12 },
      { hpx: 15 }, { hpx: 15 }, { hpx: 15 }, { hpx: 15 },
      { hpx: 12 },
      { hpx: 25 }, { hpx: 50 }, { hpx: 40 }, { hpx: 20 }, { hpx: 25 }, { hpx: 20 }, { hpx: 18 },
    ];

    // ── Merges ────────────────────────────────────────────────────────────────
    // Header starts at aoa index 8; r values are 0-based
    const HR = 8; // header row 1 in aoa (0-based)
    const merges: XLSX.Range[] = [
      // Title
      { s: { r: 1, c: 1 }, e: { r: 1, c: 20 } },

      // NO / DESA / JML_DESA / JML_POSYANDU / TOTAL SASARAN — span all 6 header rows
      { s: { r: HR, c: 0  }, e: { r: HR+5, c: 0  } }, // NO
      { s: { r: HR, c: 1  }, e: { r: HR+5, c: 1  } }, // DESA
      { s: { r: HR, c: 2  }, e: { r: HR+5, c: 2  } }, // JML DESA
      { s: { r: HR, c: 3  }, e: { r: HR+5, c: 3  } }, // JML POSYANDU
      { s: { r: HR, c: 13 }, e: { r: HR+5, c: 13 } }, // TOTAL SASARAN

      // SASARAN group (row HR, cols 4-12)
      { s: { r: HR, c: 4 }, e: { r: HR, c: 12 } },

      // PELAYANAN KESEHATAN (row HR, cols 14-77)
      { s: { r: HR, c: 14 }, e: { r: HR, c: 77 } },

      // Sasaran sub-groups (rows HR+1 to HR+3, i.e. category label rows)
      { s: { r: HR+1, c: 4  }, e: { r: HR+3, c: 6  } }, // Pra Lansia
      { s: { r: HR+1, c: 7  }, e: { r: HR+3, c: 9  } }, // Lansia
      { s: { r: HR+1, c: 10 }, e: { r: HR+3, c: 12 } }, // Risti

      // Sasaran L/P/T each span rows HR+4 to HR+5
      ...([4,5,6,7,8,9,10,11,12] as number[]).map(c => ({
        s: { r: HR+4, c }, e: { r: HR+5, c },
      })),

      // "Jumlah yang dibina" (row HR+1, cols 14-49)
      { s: { r: HR+1, c: 14 }, e: { r: HR+1, c: 49 } },

      // Skrining lansia >=60 (rows HR+1..HR+2, cols 50-61)
      { s: { r: HR+1, c: 50 }, e: { r: HR+2, c: 61 } },

      // Tingkat kemandirian (row HR+1, cols 62-73)
      { s: { r: HR+1, c: 62 }, e: { r: HR+1, c: 73 } },

      // Diberdayakan (rows HR+1..HR+2, cols 74-77)
      { s: { r: HR+1, c: 74 }, e: { r: HR+2, c: 77 } },

      // Service sub-groups (row HR+2)
      { s: { r: HR+2, c: 14 }, e: { r: HR+2, c: 25 } }, // Pra Lansia
      { s: { r: HR+2, c: 26 }, e: { r: HR+2, c: 37 } }, // Lansia
      { s: { r: HR+2, c: 38 }, e: { r: HR+2, c: 49 } }, // Risti

      // TK groups (row HR+2)
      { s: { r: HR+2, c: 62 }, e: { r: HR+2, c: 65 } }, // TK A
      { s: { r: HR+2, c: 66 }, e: { r: HR+2, c: 69 } }, // TK B
      { s: { r: HR+2, c: 70 }, e: { r: HR+2, c: 73 } }, // TK C

      // Bulan lalu / Bulan ini / Total (row HR+3)
      ...([14, 26, 38, 50] as number[]).flatMap(sc => [
        { s: { r: HR+3, c: sc     }, e: { r: HR+3, c: sc+2  } }, // Bulan lalu
        { s: { r: HR+3, c: sc+3   }, e: { r: HR+3, c: sc+5  } }, // Bulan ini
        { s: { r: HR+3, c: sc+6   }, e: { r: HR+3, c: sc+11 } }, // Total
      ]),

      // Total L/P/T merged pairs (row HR+4)
      ...([14, 26, 38, 50] as number[]).flatMap(sc => [
        { s: { r: HR+4, c: sc+6  }, e: { r: HR+4, c: sc+7  } }, // L merged
        { s: { r: HR+4, c: sc+8  }, e: { r: HR+4, c: sc+9  } }, // P merged
        { s: { r: HR+4, c: sc+10 }, e: { r: HR+4, c: sc+11 } }, // T merged
      ]),
    ];

    ws["!merges"] = merges;
    XLSX.utils.book_append_sheet(wb, ws, SHEET_NAMES[m]);
  }

  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

// ─── Month matching ───────────────────────────────────────────────────────────
export function findMonthIndex(bulanTahun: string): number {
  const upper = bulanTahun.toUpperCase().trim();
  for (let i = 0; i < MONTH_PATTERNS.length; i++) {
    if (MONTH_PATTERNS[i].some(p => upper.includes(p))) return i;
  }
  return -1;
}
