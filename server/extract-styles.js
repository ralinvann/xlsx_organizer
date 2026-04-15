const XLSX = require("xlsx");

function extractStyles(filePath, label) {
  const wb = XLSX.readFile(filePath, { cellStyles: true, cellDates: true });
  console.log("=== " + label + " ===");
  console.log("Sheets:", wb.SheetNames);

  const ws = wb.Sheets[wb.SheetNames[0]];

  // Merges
  console.log("\n--- Merges ---");
  if (ws["!merges"]) {
    for (const m of ws["!merges"]) {
      console.log(XLSX.utils.encode_range(m));
    }
  }

  // Cols
  console.log("\n--- Cols ---");
  if (ws["!cols"]) {
    ws["!cols"].forEach((c, i) => {
      if (c) console.log("Col", i, ":", JSON.stringify(c));
    });
  }

  // Rows
  console.log("\n--- Rows ---");
  if (ws["!rows"]) {
    ws["!rows"].forEach((r, i) => {
      if (r) console.log("Row", i, ":", JSON.stringify(r));
    });
  }

  // Print cells with styles
  console.log("\n--- Cells (first 25 rows) ---");
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = range.s.r; r <= Math.min(24, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell) {
        const info = { v: cell.v, t: cell.t };
        if (cell.s) info.s = cell.s;
        console.log(addr + ": " + JSON.stringify(info).substring(0, 300));
      }
    }
  }
}

extractStyles("../report type b.xls", "REPORT TYPE B");
console.log("\n\n" + "=".repeat(80) + "\n");
extractStyles("../report type a.xls", "REPORT TYPE A");
