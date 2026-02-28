import mongoose from "mongoose";
import { ElderlyMonthlyReport } from "./src/models/ElderlyMonthlyReport";
import * as dotenv from "dotenv";

dotenv.config();

async function testData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/capstone-dev";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");

    // Find the Januari 2025 report
    const report = await ElderlyMonthlyReport.findOne({
      bulanTahun: /JANUARI.*2025/i,
    });

    if (!report) {
      console.log("No report found for Januari 2025");
      process.exit(0);
    }

    console.log("\n=== REPORT METADATA ===");
    console.log("ID:", report._id);
    console.log("Kabupaten:", report.kabupaten);
    console.log("Bulan Tahun:", report.bulanTahun);
    console.log("Status:", report.status);
    console.log("Number of worksheets:", report.worksheets?.length || 0);

    if (report.worksheets && report.worksheets.length > 0) {
      const ws = report.worksheets[0];
      console.log("\n=== FIRST WORKSHEET ===");
      console.log("Worksheet Name:", ws.worksheetName);
      console.log("Puskesmas:", ws.puskesmas);
      console.log("Number of header keys:", ws.headerKeys?.length || 0);
      console.log("Number of rows:", ws.rowData?.length || 0);

      console.log("\n=== HEADER KEYS ===");
      console.log(ws.headerKeys);

      console.log("\n=== SAMPLE ROW (first 3 rows) ===");
      ws.rowData?.slice(0, 3).forEach((row: any, idx: number) => {
        console.log(`\nRow ${idx + 1}:`, JSON.stringify(row, null, 2));
      });

      // Check for key fields
      console.log("\n=== KEY FIELD CHECK ===");
      const sampleRow = ws.rowData?.[0];
      if (sampleRow) {
        const umurKey = ws.headerKeys?.find((k: string) => k.toLowerCase() === "umur");
        const jkKey = ws.headerKeys?.find((k: string) => k.toLowerCase() === "jk");
        const nikKey = ws.headerKeys?.find((k: string) => k.toLowerCase() === "nik");
        const skriningKey = ws.headerKeys?.find((k: string) => k.toLowerCase().includes("skrining") && !k.includes("_2"));
        const pemberdayaanKey = ws.headerKeys?.find((k: string) => k.toLowerCase().includes("pemberdayaan") && !k.includes("_2"));
        const tingkatAKey = ws.headerKeys?.find((k: string) => k.toLowerCase() === "a");

        console.log("UMUR key found:", umurKey, "Sample value:", sampleRow[umurKey]);
        console.log("JK key found:", jkKey, "Sample value:", sampleRow[jkKey]);
        console.log("NIK key found:", nikKey, "Sample value:", sampleRow[nikKey]?.substring(0, 5) + "...");
        console.log("SKRINING key found:", skriningKey, "Sample value:", sampleRow[skriningKey]);
        console.log("PEMBERDAYAAN key found:", pemberdayaanKey, "Sample value:", sampleRow[pemberdayaanKey]);
        console.log("TINGKAT A key found:", tingkatAKey, "Sample value:", sampleRow[tingkatAKey]);
      }

      // Test calculations
      console.log("\n=== TESTING CALCULATIONS ===");
      const calculateMetrics = (data: any) => {
        const skriningKey = ws.headerKeys?.find((k: string) => k.toLowerCase().includes("skrining") && !k.includes("_2"));
        const tingkatAKey = ws.headerKeys?.find((k: string) => k.toLowerCase() === "a");
        const tingkatBKey = ws.headerKeys?.find((k: string) => k.toLowerCase() === "b");
        const tingkatCKey = ws.headerKeys?.find((k: string) => k.toLowerCase() === "c");
        
        // Count rows (may include duplicates)
        const lansiaCount = data.filter((r: any) => r.umur >= 60).length;
        const lansiaRistiCount = data.filter((r: any) => r.umur >= 70).length;
        const skriningCount = data.filter((r: any) => r.umur >= 60 && r[skriningKey] === "Yes").length;
        const tingkatACount = data.filter((r: any) => r.umur >= 60 && r[tingkatAKey] === "Yes").length;
        const tingkatBCount = data.filter((r: any) => r.umur >= 60 && r[tingkatBKey] === "Yes").length;
        const tingkatCCount = data.filter((r: any) => r.umur >= 60 && r[tingkatCKey] === "Yes").length;
        
        // Count unique NIKs
        const allNIKs = new Set<string>();
        const niks70Plus = new Set<string>();
        const niksWithSkrining = new Set<string>();
        const niksA = new Set<string>();
        const niksB = new Set<string>();
        const niksC = new Set<string>();
        
        data.forEach((r: any) => {
          const age = r.umur || 0;
          const nik = String(r.nik || "");
          if (!nik) return;
          
          if (age >= 60) allNIKs.add(nik);
          if (age >= 70) niks70Plus.add(nik);
          if (age >= 60 && r[skriningKey] === "Yes") niksWithSkrining.add(nik);
          if (age >= 60 && r[tingkatAKey] === "Yes") niksA.add(nik);
          if (age >= 60 && r[tingkatBKey] === "Yes") niksB.add(nik);
          if (age >= 60 && r[tingkatCKey] === "Yes") niksC.add(nik);
        });
        
        return {
          lansiaCount,
          lansiaRistiCount,
          skriningCount,
          tingkatACount,
          tingkatBCount,
          tingkatCCount,
          uniqueNIKs: allNIKs.size,
          uniqueNIKs70: niks70Plus.size,
          uniqueNIKsSkrining: niksWithSkrining.size,
          uniqueNIKsA: niksA.size,
          uniqueNIKsB: niksB.size,
          uniqueNIKsC: niksC.size,
        };
      };
      
      const calc = calculateMetrics(ws.rowData);
      console.log("Total Rows:", ws.rowData.length);
      console.log("\nRow Counts (may include duplicate NIKs):");
      console.log("  Lansia (≥60):", calc.lansiaCount);
      console.log("  Lansia Risti (≥70):", calc.lansiaRistiCount);
      console.log("  With Skrining:", calc.skriningCount);
      console.log("  Tingkat Kemandirian A:", calc.tingkatACount);
      console.log("  Tingkat Kemandirian B:", calc.tingkatBCount);
      console.log("  Tingkat Kemandirian C:", calc.tingkatCCount);
      console.log("\nDistinct NIK Counts (no duplicates):");
      console.log("  Unique Lansia (≥60):", calc.uniqueNIKs);
      console.log("  Unique Lansia Risti (≥70):", calc.uniqueNIKs70);
      console.log("  Unique with Skrining:", calc.uniqueNIKsSkrining);
      console.log("  Unique Tingkat Kemandirian A:", calc.uniqueNIKsA);
      console.log("  Unique Tingkat Kemandirian B:", calc.uniqueNIKsB);
      console.log("  Unique Tingkat Kemandirian C:", calc.uniqueNIKsC);
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

testData();
