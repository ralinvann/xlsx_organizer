const XLSX = require("xlsx");

function extractStyles(filePath, label) {
  const wb = XLSX.readFile(filePath, { cellStyles: true, cellDates: true, cellNF: true });
  console.log("=== " + label + " ===");
  console.log("Sheets:", wb.SheetNames);
  
  if (wb.Themes) console.log("Has themes: yes");

  const ws = wb.Sheets[wb.SheetNames[0]];

  // Merges
  console.log("\n--- Merges ---");
  if (ws["!merges"]) {
    for (const m of ws["!merges"]) {
      console.log(XLSX.utils.encode_range(m));
    }
  }

  // Important cols only
  console.log("\n--- Column widths (first 18) ---");
  if (ws["!cols"]) {
    ws["!cols"].slice(0, 18).forEach((c, i) => {
      if (c) console.log("Col " + i + ": wch=" + (c.wch||"?") + " wpx=" + (c.wpx||"?"));
    });
  }

  // Rows (first 20)
  console.log("\n--- Row heights (first 20) ---");
  if (ws["!rows"]) {
    ws["!rows"].slice(0, 20).forEach((r, i) => {
      if (r) console.log("Row " + i + ": hpx=" + (r.hpx||"?"));
    });
  }

  // Print cells - first 15 rows, first 18 cols
  console.log("\n--- Cells (first 15 rows, cols A-R) ---");
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = range.s.r; r <= Math.min(14, range.e.r); r++) {
    for (let c = range.s.c; c <= Math.min(17, range.e.c); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell) {
        let out = addr + ": v=" + JSON.stringify(cell.v) + " t=" + cell.t;
        if (cell.s) out += " s=" + JSON.stringify(cell.s);
        if (cell.z) out += " z=" + cell.z;
        console.log(out);
      }
    }
  }
}

extractStyles("../report type b.xls", "REPORT TYPE B");
console.log("\n\n" + "=".repeat(80) + "\n");
extractStyles("../report type a.xls", "REPORT TYPE A");
