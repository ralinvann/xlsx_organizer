# Data Format Guide for Elder Care System

## Overview
This guide specifies the exact format required for Excel files to be properly processed by the Elder Care reporting system.

---

## Part 1: File Structure

### Header Rows (Rows 1-5) - HIDDEN in Display but Required in File
These rows contain metadata about the report and should be hidden/not visible in the main display area.

**Row 2 (B2:C2)** - Kabupaten (District)
```
B2: "KABUPATEN:"  | C2: "[District Name]"
Example: B2: "KABUPATEN:" | C2: "DKI JAKARTA"
```

**Row 3 (B3:C3)** - Puskesmas (Health Center)
```
B3: "PUSKESMAS:"  | C3: "[Health Center Name]"
Example: B3: "PUSKESMAS:" | C3: "Puskesmas Cilandak"
```

**Row 4 (B4:C4)** - Month/Year (REQUIRED - controls report categorization)
```
B4: "BULAN:"  | C4: "[MONTH YEAR]"
Format: "BULAN TAHUN" (e.g., "JANUARI 2024", "FEBRUARI 2024")
Examples: "JANUARI 2024", "FEBRUARI 2024", "MARET 2024"
English months are also accepted: "JANUARY 2024"
NOTE: This field determines which monthly report your data belongs to!
```

---

## Part 2: Data Header Rows (Row 6+)

**Row 6 and beyond** contain your data headers.

If you have multi-row headers with **merged cells**, the system will:
1. Detect merged cell ranges
2. Store the merge information
3. Preserve merged cells in exports

### Column Name Rules

Column names are case-insensitive and normalized. Use these standardized names or include keywords:

| Column | Required/Optional | Keywords/Variations | Purpose |
|--------|---|---|---|
| **NIK** | ❌ **CRITICAL** | nik, NIK | National ID - MUST be unique per individual |
| **NAMA** | ⚠️ Recommended | nama, nama lengkap, name | Full name of elderly person |
| **UMUR** | ⚠️ Recommended | umur, age, usia | Age in years (≥60 = elderly, ≥45 = pre-elderly) |
| **TANGGAL LAHIR** | ⚠️ Recommended | tanggal lahir, tgl lahir, date of birth | Birth date (used to calculate age if UMUR missing) |
| **JK** | ❌ **REQUIRED** | jk, jenis kelamin, gender | L=Male, P=Female |
| **SKRINING** | ⚠️ Service Field | skrining, screening | Mark with: Y, Yes, Ya, V, ✓, X, 1, TRUE |
| **PENGOBATAN** | ⚠️ Service Field | pengobatan, treatment | Mark with: Y, Yes, Ya, V, ✓, X, 1, TRUE |
| **PENYULUHAN** | ⚠️ Service Field | penyuluhan, health education | Mark with: Y, Yes, Ya, V, ✓, X, 1, TRUE |
| **PEMBERDAYAAN** | ⚠️ Service Field | pemberdayaan, empowerment | Mark with: Y, Yes, Ya, V, ✓, X, 1, TRUE |
| **A**, **B**, **C** | ⚠️ For Elderly | tingkat kemandirian, independence level | Mark with: Y, Yes, Ya, V, ✓, X, 1, TRUE (for age ≥60) |
| **ALAMAT** | ✓ Optional | alamat, address | Address - serves as data delineator |
| Additional Columns | ✓ Optional | Any other data | Will be preserved and displayed |

---

## Part 3: Data Rows (From Row 6 onwards)

Data starts from row 6 (or after headers if multi-row header).

### Data Entry Rules

1. **NIK (Critical)**
   - Must be unique identifier per person
   - Cannot be blank - records without NIK are skipped
   - Used for deduplication in metrics

2. **Age Calculation** (Must have one of these)
   - **Option A**: Direct UMUR column with numeric age
   - **Option B**: TANGGAL LAHIR column with birth date (system calculates age)
   - Records without age are skipped
   
3. **Gender (JK)** - REQUIRED
   - Values: L, LAKI-LAKI, P, PEREMPUAN
   - Case-insensitive
   - Records without gender are skipped

4. **Service Marking**
   - Any of these mean "service provided": Y, Yes, Ya, V, ✓, X, 1, TRUE
   - Empty, blank, or N = service not provided
   - Case-insensitive

5. **Independence Level (A/B/C)** - Only for age ≥ 60
   - A = Mandiri (Independent)
   - B = Ketergantungan Ringan (Light Dependency)
   - C = Ketergantungan Berat (Heavy Dependency)
   - Mark with same values as services

### Data Termination
- Add a row with "DIKETAHUI" in column B to mark end of data (optional)
- Or system will read until last non-empty row

---

## Part 4: Metric Calculations (What System Generates)

### Age Groups (from NIK/UMUR/TANGGAL LAHIR)
- **Pre-Elderly (45-59)**: PRA LANSIA
- **Elderly (60+)**: LANSIA  
- **At-Risk Elderly (70+)**: LANSIA RISIKO TINGGI

### Gender Breakdown
- L = Laki-laki (Male)
- P = Perempuan (Female)
- T = Total

### Services Tracked
- SKRINING (Screening)
- PENGOBATAN (Treatment)
- PENYULUHAN (Health Education)
- PEMBERDAYAAN (Empowerment)

### Independence Levels (Age ≥ 60 only)
- **A (Mandiri)**: Independent
- **B_Ringan**: Light dependency
- **B_Sedang**: Moderate dependency (if available)
- **C_Berat**: Heavy dependency
- **C_Total**: Total dependency (if available)

---

## Example File Structure

```
Row 1: [Hidden - can be blank or title]
Row 2: [Hidden] | B2: "KABUPATEN:" | C2: "DKI JAKARTA"
Row 3: [Hidden] | B3: "PUSKESMAS:" | C3: "Puskesmas Cilandak"
Row 4: [Hidden] | B4: "BULAN:" | C4: "JANUARI 2024"
Row 5: [Hidden - blank or separator]
Row 6: [HEADERS] | NIK | Nama | UMUR | JK | SKRINING | PENGOBATAN | PENYULUHAN | PEMBERDAYAAN | A | B | C | [Other Columns]
Row 7: [DATA] | 3171234567890 | Ibu Siti | 65 | P | Y | Y |  | Y | Y | | | ...
Row 8: [DATA] | 3171234567891 | Bapak Hendra | 72 | L | Y | | Y |  | | Y | | ...
...
[Last data row]
```

---

## Validation Checklist Before Uploading

- [ ] **Month (Row 4, C4)** is in format "MONTH YEAR" (e.g., "JANUARI 2024")
- [ ] **Kabupaten (Row 2, C2)** is filled
- [ ] **Puskesmas (Row 3, C3)** is filled
- [ ] **Data starts at Row 6** (or adjust if you have different header rows)
- [ ] **Every data row has NIK** (unique identifier)
- [ ] **Every data row has JK** (gender: L or P)
- [ ] **Every data row has UMUR** or **TANGGAL LAHIR** (for age calculation)
- [ ] **Service columns** (Skrining, Pengobatan, Penyuluhan, Pemberdayaan) are marked with Y/Yes/V/✓
- [ ] **Dependency columns** (A/B/C) are marked with Y/Yes/V/✓ for elderly (age ≥60)
- [ ] **No blank rows** between header and data
- [ ] **Merged header cells** are preserved (system detects them automatically)

---

## Troubleshooting

### "No matching report found"
- Check that your **Month/Year in Row 4, C4** exactly matches what you're searching for

### Record counts are 0
- Ensure **NIK**, **JK**, and **UMUR/Tanggal Lahir** are present for each record
- Records missing any of these are automatically skipped

### Age is not calculated correctly
- Use numeric values (e.g., 65, 72) for UMUR column
- Or use standard date format (DD/MM/YYYY or YYYY-MM-DD) for TANGGAL LAHIR

### Service counts are wrong
- Ensure service columns use: Y, Yes, Ya, V, ✓, X, 1, or TRUE (case-insensitive)
- Empty cells or "N" are treated as not provided

### Merged cells are not showing
- Merged header cells should be preserved automatically
- Check that file is in .xlsx format (not .csv or .xls)

---

## Notes for Form File Creation

1. **Hide rows 1-5** in your template for cleaner display
2. **Use merged cells** in header area for multi-level headers (e.g., "SKRINING" spanning multiple columns)
3. **Use data validation** for JK column (L/P dropdown)
4. **Use data validation** for service columns (Y/N dropdown)
5. **Add column headers with exact names** from this guide
6. Keep **NIK column unique** via conditional formatting or validation
7. Test with **sample data first** before distributing to data entry staff

---

**Last Updated:** February 26, 2026  
**System Version:** 1.0 with Merged Cells Support
