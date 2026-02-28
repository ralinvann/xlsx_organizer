import * as XLSX from "xlsx";

interface IndividualRecord {
  [key: string]: any;
}

interface WorksheetData {
  worksheetName: string;
  puskesmas: string;
  kabupaten: string;
  bulanTahun: string;
  headerKeys: string[];
  headerLabels: string[];
  rowData: IndividualRecord[];
}

interface MonthlyReportPayload {
  kabupaten: string;
  bulanTahun: string;
  worksheets: WorksheetData[];
}

// Helper: Extract month and year
function parseMonthYear(bulanTahun: string): { month: string; year: string } {
  const parts = bulanTahun.trim().toUpperCase().split(/\s+/);
  const month = parts[0] || "BULAN";
  const year = parts[1] || new Date().getFullYear().toString();
  return { month, year };
}

// Helper: Get age from UMUR or TANGGAL LAHIR
function getAge(record: IndividualRecord, headerKeys: string[]): number | null {
  // Check for explicit UMUR field
  const umurKey = headerKeys.find(k => k.toLowerCase() === "umur");
  if (umurKey && record[umurKey] !== null && record[umurKey] !== undefined) {
    const age = Number(record[umurKey]);
    if (!isNaN(age)) return age;
  }

  // Fall back to calculating from TANGGAL LAHIR
  const tanggalKey = headerKeys.find(
    k => k.toLowerCase().includes("tanggal") && k.toLowerCase().includes("lahir")
  );
  if (tanggalKey && record[tanggalKey]) {
    try {
      const birthValue = record[tanggalKey];
      let birthDate: Date;

      if (typeof birthValue === "number" && Number.isInteger(birthValue)) {
        const excelEpoch = new Date(1899, 11, 30);
        birthDate = new Date(excelEpoch.getTime() + birthValue * 24 * 60 * 60 * 1000);
      } else if (typeof birthValue === "string") {
        birthDate = new Date(birthValue);
      } else {
        return null;
      }

      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return Math.max(0, age);
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}

// Helper: Get gender (L/P)
function getGender(record: IndividualRecord, headerKeys: string[]): string | null {
  const jkKey = headerKeys.find(
    k => k.toLowerCase() === "jk" || (k.toLowerCase().includes("jenis") && k.toLowerCase().includes("kelamin"))
  );
  if (jkKey) {
    const val = String(record[jkKey] || "").trim().toUpperCase();
    if (val === "L" || val === "LAKI-LAKI" || val.startsWith("L")) return "L";
    if (val === "P" || val === "PEREMPUAN" || val.startsWith("P")) return "P";
  }
  return null;
}

// Helper: Check if service column is marked
function isServiceMarked(value: any): boolean {
  if (value === null || value === undefined || value === "") return false;
  const str = String(value).trim().toLowerCase();
  return str === "yes" || str === "ya" || str === "v" || str === "✓" || str === "x" || str === "1" || str === "true";
}

// Helper: Get NIK
function getNIK(record: IndividualRecord, headerKeys: string[]): string {
  const nikKey = headerKeys.find(k => k.toLowerCase() === "nik");
  return nikKey ? String(record[nikKey] || "").trim() : "";
}

// Main calculation function
function calculateMetrics(worksheet: WorksheetData): any {
  const { rowData, headerKeys } = worksheet;

  // Find key columns
  const skriningKey = headerKeys.find(k => k.toLowerCase().includes("skrining") && !k.includes("_2"));
  const pengobatanKey = headerKeys.find(k => k.toLowerCase().includes("pengobatan") && !k.includes("_2"));
  const penyuluhanKey = headerKeys.find(k => k.toLowerCase().includes("penyuluhan") && !k.includes("_2"));
  const pemberdayaanKey = headerKeys.find(k => k.toLowerCase().includes("pemberdayaan") && !k.includes("_2"));
  
  // Tingkat kemandirian - stored as separate a, b, c columns
  const tingkatAKey = headerKeys.find(k => k.toLowerCase() === "a");
  const tingkatBKey = headerKeys.find(k => k.toLowerCase() === "b");
  const tingkatCKey = headerKeys.find(k => k.toLowerCase() === "c");

  const metrics: any = {
    // SASARAN
    preLansia: { L: new Set(), P: new Set(), T: new Set() },
    lansia: { L: new Set(), P: new Set(), T: new Set() },
    lansiaRisti: { L: new Set(), P: new Set(), T: new Set() },
    yangDibina: { L: new Set(), P: new Set(), T: new Set() },
    
    // PELAYANAN KESEHATAN - SKRINING
    skriningPreLansia: { L: new Set(), P: new Set(), T: new Set() },
    skriningLansia: { L: new Set(), P: new Set(), T: new Set() },
    skriningLansiaRisti: { L: new Set(), P: new Set(), T: new Set() },
    
    // TINGKAT KEMANDIRIAN - the format expects 5 sub-categories but we only have A, B, C
    // We'll map: A=A (Mandiri), B=B_ringan, C could be split but for now treat as C_berat
    tingkatKemandirian: {
      A: new Set(),           // Mandiri
      B_ringan: new Set(),    // Ketergantungan Ringan
      B_sedang: new Set(),    // Ketergantungan Sedang - empty for now
      C_berat: new Set(),     // Ketergantungan Berat
      C_total: new Set(),     // Ketergantungan Total - empty for now
    },
    
    // PEMBERDAYAAN
    diberdayakan: new Set(),
  };

  for (const record of rowData) {
    const age = getAge(record, headerKeys);
    const gender = getGender(record, headerKeys);
    const nik = getNIK(record, headerKeys);

    if (age === null || gender === null || !nik) continue;

    // SASARAN - Count distinct NIK by age group
    if (age >= 45 && age < 60) {
      metrics.preLansia[gender].add(nik);
      metrics.preLansia.T.add(nik);
    }

    if (age >= 60) {
      metrics.lansia[gender].add(nik);
      metrics.lansia.T.add(nik);
    }

    if (age >= 70) {
      metrics.lansiaRisti[gender].add(nik);
      metrics.lansiaRisti.T.add(nik);
    }

    // YANG DIBINA - has at least one service
    const hasService = 
      (skriningKey && isServiceMarked(record[skriningKey])) ||
      (pengobatanKey && isServiceMarked(record[pengobatanKey])) ||
      (penyuluhanKey && isServiceMarked(record[penyuluhanKey])) ||
      (pemberdayaanKey && isServiceMarked(record[pemberdayaanKey]));

    if (hasService) {
      metrics.yangDibina[gender].add(nik);
      metrics.yangDibina.T.add(nik);
    }

    // SKRINING by age group
    if (skriningKey && isServiceMarked(record[skriningKey])) {
      if (age >= 45 && age < 60) {
        metrics.skriningPreLansia[gender].add(nik);
        metrics.skriningPreLansia.T.add(nik);
      }
      if (age >= 60) {
        metrics.skriningLansia[gender].add(nik);
        metrics.skriningLansia.T.add(nik);
      }
      if (age >= 70) {
        metrics.skriningLansiaRisti[gender].add(nik);
        metrics.skriningLansiaRisti.T.add(nik);
      }
    }

    // TINGKAT KEMANDIRIAN (age >= 60 only)
    // Data has separate a, b, c columns with Yes/No
    if (age >= 60) {
      if (tingkatAKey && isServiceMarked(record[tingkatAKey])) {
        metrics.tingkatKemandirian.A.add(nik);
      }
      if (tingkatBKey && isServiceMarked(record[tingkatBKey])) {
        metrics.tingkatKemandirian.B_ringan.add(nik);
      }
      if (tingkatCKey && isServiceMarked(record[tingkatCKey])) {
        metrics.tingkatKemandirian.C_berat.add(nik);
      }
    }

    // PEMBERDAYAAN (age >= 60 only)
    if (age >= 60 && pemberdayaanKey && isServiceMarked(record[pemberdayaanKey])) {
      metrics.diberdayakan.add(nik);
    }
  }

  // Convert Sets to counts and calculate percentages
  const totalLansia = metrics.lansia.T.size || 1; // Avoid division by zero

  return {
    preLansia: {
      L: metrics.preLansia.L.size,
      P: metrics.preLansia.P.size,
      T: metrics.preLansia.T.size,
    },
    lansia: {
      L: metrics.lansia.L.size,
      P: metrics.lansia.P.size,
      T: metrics.lansia.T.size,
    },
    lansiaRisti: {
      L: metrics.lansiaRisti.L.size,
      P: metrics.lansiaRisti.P.size,
      T: metrics.lansiaRisti.T.size,
    },
    yangDibina: {
      L: metrics.yangDibina.L.size,
      P: metrics.yangDibina.P.size,
      T: metrics.yangDibina.T.size,
    },
    skriningPreLansia: {
      L: metrics.skriningPreLansia.L.size,
      P: metrics.skriningPreLansia.P.size,
      T: metrics.skriningPreLansia.T.size,
    },
    skriningLansia: {
      L: metrics.skriningLansia.L.size,
      P: metrics.skriningLansia.P.size,
      T: metrics.skriningLansia.T.size,
    },
    skriningLansiaRisti: {
      L: metrics.skriningLansiaRisti.L.size,
      P: metrics.skriningLansiaRisti.P.size,
      T: metrics.skriningLansiaRisti.T.size,
    },
    tingkatKemandirian: {
      A: {
        abs: metrics.tingkatKemandirian.A.size,
        persen: ((metrics.tingkatKemandirian.A.size / totalLansia) * 100).toFixed(2),
      },
      B_ringan: {
        abs: metrics.tingkatKemandirian.B_ringan.size,
        persen: ((metrics.tingkatKemandirian.B_ringan.size / totalLansia) * 100).toFixed(2),
      },
      B_sedang: {
        abs: metrics.tingkatKemandirian.B_sedang.size,
        persen: ((metrics.tingkatKemandirian.B_sedang.size / totalLansia) * 100).toFixed(2),
      },
      C_berat: {
        abs: metrics.tingkatKemandirian.C_berat.size,
        persen: ((metrics.tingkatKemandirian.C_berat.size / totalLansia) * 100).toFixed(2),
      },
      C_total: {
        abs: metrics.tingkatKemandirian.C_total.size,
        persen: ((metrics.tingkatKemandirian.C_total.size / totalLansia) * 100).toFixed(2),
      },
    },
    diberdayakan: {
      abs: metrics.diberdayakan.size,
      persen: ((metrics.diberdayakan.size / totalLansia) * 100).toFixed(2),
    },
  };
}

export async function generateMonthlyReportExcel(
  payload: MonthlyReportPayload
): Promise<Buffer> {
  const { kabupaten, bulanTahun, worksheets } = payload;
  const { month, year } = parseMonthYear(bulanTahun);
  
  console.log("🔵 generateMonthlyReportExcel called");
  console.log("   Worksheets count:", worksheets.length);
  if (worksheets[0]) {
    console.log("   First worksheet has", worksheets[0].rowData?.length || 0, "rows");
    console.log("   Header keys:", worksheets[0].headerKeys);
  }
  
  // Clean kabupaten (remove leading colon and trim)
  const cleanKabupaten = kabupaten.replace(/^:\s*/, "").trim();

  const wb = XLSX.utils.book_new();

  for (const ws of worksheets) {
    const sheetName = ws.worksheetName || ws.puskesmas || "Data";
    const metrics = calculateMetrics(ws);
    console.log("   Metrics calculated:", { 
      lansiaCount: metrics.lansia.T, 
      skriningCount: metrics.skriningLansia.T 
    });
    
    // Clean puskesmas name (remove leading colon and trim)
    const cleanPuskesmas = (ws.puskesmas || "").replace(/^:\s*/, "").trim();

    // Build the complex 5-level header structure matching the expected format
    const allRows: any[][] = [];

    // ROW 1: KABUPATEN
    const row1 = ["KABUPATEN", ":", cleanKabupaten];
    allRows.push(row1);

    // ROW 2: TAHUN
    const row2 = ["TAHUN", ":", year];
    allRows.push(row2);

    // ROW 3: BULAN
    const row3 = ["BULAN", ":", month];
    allRows.push(row3);

    // ROW 4: Empty
    allRows.push([]);

    // ROW 5: LEVEL 1 - Main section headers
    const row5 = [
      "NO.",
      "PUSKESMAS",
      "JUMLAH DESA / KELURAHAN",
      "JUMLAH POSYANDU LANSIA",
      "SASARAN", "", "", "", "", "", "", "", "", "", "", "", // 12 columns (4 groups × 3)
      "PELAYANAN KESEHATAN", ...Array(68).fill(""), // 69 columns total
      "SARANA", ...Array(18).fill(""), // 19 columns total
      "SDM", "", "", "" // 4 columns
    ];
    allRows.push(row5);

    // ROW 6: LEVEL 2 - Age groups and sub-sections
    const row6 = [
      "", "", "", "", // Empty under NO, PUSKESMAS, etc.
      "JUMLAH\nPRA LANSIA\n(45-59 TAHUN)", "", "",
      "JUMLAH LANSIA\n( ≥ 60 TAHUN)", "", "",
      "JUMLAH LANSIA RISTI (≥ 70 TAHUN)", "", "",
      "JUMLAH  YANG DIBINA/ YANG MENDAPAT PELAYANAN KESEHATAN", "", "",
      "LANSIA (≥ 60 TAHUN) YANG DISKRINING KESEHATAN SESUAI STANDAR", ...Array(26).fill(""),
      "JUMLAH LANSIA DENGAN TINGKAT KEMANDIRIAN", ...Array(9).fill(""),
      "JUMLAH LANSIA YANG DIBERDAYAKAN", "",
      "JUMLAH KELOMPOK LANSIA/ POSYANDU LANSIA/ POSBINDU", ...Array(4).fill(""),
      "JUMLAH PANTI WERDHA YANG DIBINA",
      "PUSKESMAS", ...Array(12).fill(""),
      "JUMLAH TENAGA YANG MENDAPATKAN PELATIHAN LANSIA GERIATRI", "", "", ""
    ];
    allRows.push(row6);

    // ROW 7: LEVEL 3 - Time periods for skrining
    const row7 = [
      "", "", "", "", // Empty
      // SASARAN - no third level
      "", "", "", "", "", "", "", "", "", "", "", "",
      // SKRINING age groups
      "PRA LANSIA\n(45-59 TAHUN)", ...Array(8).fill(""),
      "LANSIA\n(≥ 60 TAHUN)", ...Array(8).fill(""),
      "LANSIA RISTI\n(≥ 70 TAHUN)", ...Array(8).fill(""),
      // TINGKAT KEMANDIRIAN
      "TINGKAT KEMANDIRIAN A (MANDIRI)", "",
      "TINGKAT KEMANDIRIAN B (KETERGANTUNGAN RINGAN)", "",
      "TINGKAT KEMANDIRIAN KETERGANTUNGAN B (SEDANG)", "",
      "TINGKAT KEMANDIRIAN C (KETERGANTUNGAN BERAT)", "",
      "TINGKAT KEMANDIRIAN C (KETERGANTUNGAN TOTAL)", "",
      // DIBERDAYAKAN
      "", "",
      // KELOMPOK
      "PRATAMA", "MADYA", "PURNAMA", "MANDIRI", "TOTAL",
      "", // PANTI
      // PUSKESMAS
      "JUMLAH PUSKESMAS", "", "",
      "PUSKESMAS YANG MELAKSANAKAN PELAYANAN KESEHATAN SANTUN LANSIA", "",
      "PUSKESMAS DENGAN POSYANDU LANSIA AKTIF", "",
      "PUSKESMAS YANG MELAKSANAKAN LONG TERM CARE", "",
      // SDM
      "DOKTER", "", "PERAWAT", ""
    ];
    allRows.push(row7);

    // ROW 8: LEVEL 4 - Time periods (BULAN LALU/BULAN INI/TOTAL) and gender
    const row8 = [
      "", "", "", "",
      // SASARAN
      "L", "P", "T", "L", "P", "T", "L", "P", "T", "L", "P", "T",
      // SKRINING - each age group has BULAN LALU, BULAN INI, TOTAL
      "BULAN LALU", "", "", "BULAN INI", "", "", "TOTAL", "", "",
      "BULAN LALU", "", "", "BULAN INI", "", "", "TOTAL", "", "",
      "BULAN LALU", "", "", "BULAN INI", "", "", "TOTAL", "", "",
      // TINGKAT KEMANDIRIAN
      "ABSOLUT", "%", "ABSOLUT", "%", "ABSOLUT", "%", "ABSOLUT", "%", "ABSOLUT", "%",
      // DIBERDAYAKAN
      "ABSOLUT", "",
      // KELOMPOK
      "", "", "", "", "",
      "", // PANTI
      // SARANA
      "BULAN LALU", "BULAN INI", "TOTAL",
      "", "",
      "", "",
      "", "",
      // SDM
      "Abs.", "%", "Abs.", "%"
    ];
    allRows.push(row8);

    // ROW 9: LEVEL 5 - Gender breakdown for time periods
    const row9 = [
      "", "", "", "",
      // SASARAN (already has L/P/T)
      "", "", "", "", "", "", "", "", "", "", "", "",
      // SKRINING - L/P/T for each time period
      "L", "P", "T", "L", "P", "T", "L", "P", "T",
      "L", "P", "T", "L", "P", "T", "L", "P", "T",
      "L", "P", "T", "L", "P", "T", "L", "P", "T",
      // TINGKAT KEMANDIRIAN (already has Abs/%)
      "", "", "", "", "", "", "", "", "", "",
      // DIBERDAYAKAN
      "", "%",
      // KELOMPOK
      "", "", "", "", "",
      "", // PANTI
      // SARANA
      "", "", "",
      "Abs.", "%",
      "Abs.", "%",
      "Abs.", "%",
      // SDM (already has Abs/%)
      "", "", "", ""
    ];
    allRows.push(row9);

    // ROW 10: LEVEL 6 - Abs. labels where needed
    const row10 = [
      "", "", "", "",
      "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.",
      // SKRINING - all Abs.
      "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.",
      "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.",
      "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.", "Abs.",
      // Rest already labeled
      ...Array(40).fill("")
    ];
    allRows.push(row10);

    // ROW 11: Column numbers (1, 2, 3, ...)
    const totalCols = 107; // Based on the expected format
    const row11 = Array.from({ length: totalCols }, (_, i) => i + 1);
    allRows.push(row11);

    // ROW 12+: DATA ROWS
    const dataRow = [
      1, // NO
      cleanPuskesmas,
      "", // Manual: JUMLAH DESA
      "", // Manual: JUMLAH POSYANDU
      // SASARAN (columns 5-16)
      metrics.preLansia.L, metrics.preLansia.P, metrics.preLansia.T,
      metrics.lansia.L, metrics.lansia.P, metrics.lansia.T,
      metrics.lansiaRisti.L, metrics.lansiaRisti.P, metrics.lansiaRisti.T,
      metrics.yangDibina.L, metrics.yangDibina.P, metrics.yangDibina.T,
      // SKRINING (columns 17-43)
      // Pre-Lansia: BULAN LALU, BULAN INI, TOTAL
      0, 0, 0, metrics.skriningPreLansia.L, metrics.skriningPreLansia.P, metrics.skriningPreLansia.T,
      metrics.skriningPreLansia.L, metrics.skriningPreLansia.P, metrics.skriningPreLansia.T,
      // Lansia: BULAN LALU, BULAN INI, TOTAL
      0, 0, 0, metrics.skriningLansia.L, metrics.skriningLansia.P, metrics.skriningLansia.T,
      metrics.skriningLansia.L, metrics.skriningLansia.P, metrics.skriningLansia.T,
      // Lansia Risti: BULAN LALU, BULAN INI, TOTAL
      0, 0, 0, metrics.skriningLansiaRisti.L, metrics.skriningLansiaRisti.P, metrics.skriningLansiaRisti.T,
      metrics.skriningLansiaRisti.L, metrics.skriningLansiaRisti.P, metrics.skriningLansiaRisti.T,
      // TINGKAT KEMANDIRIAN (columns 44-53)
      metrics.tingkatKemandirian.A.abs, metrics.tingkatKemandirian.A.persen,
      metrics.tingkatKemandirian.B_ringan.abs, metrics.tingkatKemandirian.B_ringan.persen,
      metrics.tingkatKemandirian.B_sedang.abs, metrics.tingkatKemandirian.B_sedang.persen,
      metrics.tingkatKemandirian.C_berat.abs, metrics.tingkatKemandirian.C_berat.persen,
      metrics.tingkatKemandirian.C_total.abs, metrics.tingkatKemandirian.C_total.persen,
      // DIBERDAYAKAN (columns 54-55)
      metrics.diberdayakan.abs, metrics.diberdayakan.persen,
      // KELOMPOK (columns 56-60) - Manual
      "", "", "", "", "",
      // PANTI WERDHA (column 61)
      "",
      // SARANA - PUSKESMAS (columns 62-74)
      "", "", "", // JUMLAH PUSKESMAS (BL, BI, TOTAL)
      "", "", // PELAYANAN SANTUN (Abs, %)
      "", "", // POSYANDU AKTIF (Abs, %)
      "", "", // LONG TERM CARE (Abs, %)
      // SDM (columns 75-78)
      "", "", "", ""
    ];
    console.log("   Data row length:", dataRow.length);
    console.log("   Data row (first 20):", dataRow.slice(0, 20));
    allRows.push(dataRow);
    console.log("   Total rows in allRows:", allRows.length);

    // TOTAL row (optional - can be calculated later)
    // allRows.push([...]);

    // Create worksheet from array of arrays
    const worksheet = XLSX.utils.aoa_to_sheet(allRows);

    // Set column widths
    worksheet["!cols"] = Array(totalCols).fill(null).map(() => ({ wch: 12 }));
    
    // First few columns wider
    worksheet["!cols"][0] = { wch: 5 };  // NO
    worksheet["!cols"][1] = { wch: 20 }; // PUSKESMAS
    worksheet["!cols"][2] = { wch: 15 }; // JUMLAH DESA
    worksheet["!cols"][3] = { wch: 15 }; // JUMLAH POSYANDU

    // Add to workbook
    XLSX.utils.book_append_sheet(wb, worksheet, sheetName.substring(0, 31));
  }

  // Generate Excel buffer
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
}
