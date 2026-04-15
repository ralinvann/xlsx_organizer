const XLSX = require("xlsx");

// Report A - get all column widths and data row colors
const wbA = XLSX.readFile("../report type a.xls", { cellStyles: true });
const wsA = wbA.Sheets[wbA.SheetNames[0]];

console.log("=== REPORT A - All col widths ===");
if (wsA["!cols"]) {
  wsA["!cols"].slice(0, 78).forEach((c, i) => {
    if (c && c.wch) console.log("Col " + i + " (" + XLSX.utils.encode_col(i) + "): wch=" + c.wch);
  });
}

// Get row 14 (column numbers) color and row 15 data row colors for ALL columns
console.log("\n=== Report A - Row 14 (column numbers) and Row 15 (data) cell colors ===");
for (let r = 13; r <= 15; r++) { // 0-indexed in xlsx: row 14 = index 13, row 15 = index 14
  console.log("Row " + (r+1) + ":");
  for (let c = 0; c < 78; c++) {
    const addr = XLSX.utils.encode_cell({r, c});
    const cell = wsA[addr];
    if (cell && cell.s) {
      console.log("  " + XLSX.utils.encode_col(c) + ": fg=" + (cell.s.fgColor ? cell.s.fgColor.rgb : "none"));
    }
  }
}

// More header rows colors
console.log("\n=== Report A - Header rows 8-13 colors (beyond col R) ===");
for (let r = 7; r <= 13; r++) {
  let colors = [];
  for (let c = 18; c < 78; c++) {
    const addr = XLSX.utils.encode_cell({r, c});
    const cell = wsA[addr];
    if (cell && cell.s && cell.s.fgColor) {
      colors.push(XLSX.utils.encode_col(c) + "=" + cell.s.fgColor.rgb);
    }
  }
  if (colors.length) console.log("Row " + (r+1) + ": " + colors.join(", "));
}

// Get cell values for header rows beyond R
console.log("\n=== Report A - Header rows 8-14 cell values (cols S-BZ) ===");
for (let r = 7; r <= 13; r++) {
  for (let c = 18; c < 78; c++) {
    const addr = XLSX.utils.encode_cell({r, c});
    const cell = wsA[addr];
    if (cell && cell.v !== undefined && cell.t !== "z") {
      let fg = cell.s && cell.s.fgColor ? " fg=" + cell.s.fgColor.rgb : "";
      console.log("  [" + (r+1) + "," + XLSX.utils.encode_col(c) + "] " + JSON.stringify(cell.v).substring(0,60) + fg);
    }
  }
}

// Report A merges for reference
console.log("\n=== Report A - All merges (decoded) ===");
if (wsA["!merges"]) {
  for (const m of wsA["!merges"]) {
    console.log(XLSX.utils.encode_range(m));
  }
}
