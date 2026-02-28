# 🎯 QUICK REFERENCE: EXCEL FILE REQUIREMENTS

## MUST HAVE (3 Critical Fields)
```
NIK          Jenis Kelamin (JK)     UMUR or Tanggal Lahir
例：3171234   例：L or P             例：65 or 15/03/1955
```
**If ANY of these are missing in a row → ENTIRE ROW IS IGNORED**

---

## METADATA (Hidden Rows 2-4)
```
Row 2: B2 = "KABUPATEN:" | C2 = District Name
Row 3: B3 = "PUSKESMAS:" | C3 = Health Center Name  
Row 4: B4 = "BULAN:"     | C4 = MONTH YEAR (e.g., JANUARI 2024)
```

---

## DATA COLUMNS (Row 6+)

| Column | Required? | Format | Notes |
|--------|-----------|--------|-------|
| **NIK** | 🔴 YES | 16 digits | Unique per person |
| **Nama** | 🟢 Optional | Text | Full name |
| **UMUR** | 🔴 YES* | Number | Age (45=Pre-elderly, 60+=Elderly) |
| **Tanggal Lahir** | 🔴 YES* | DD/MM/YYYY | Birth date (alternative to UMUR) |
| **JK** | 🔴 YES | L or P | L=Male, P=Female |
| **SKRINING** | 🟡 Recommended | Y/V/✓ or blank | Screening service |
| **PENGOBATAN** | 🟡 Recommended | Y/V/✓ or blank | Treatment service |
| **PENYULUHAN** | 🟡 Recommended | Y/V/✓ or blank | Health education |
| **PEMBERDAYAAN** | 🟡 Recommended | Y/V/✓ or blank | Empowerment service |
| **A** | 🟡 For age≥60 | Y/V/✓ or blank | Independent |
| **B** | 🟡 For age≥60 | Y/V/✓ or blank | Light dependency |
| **C** | 🟡 For age≥60 | Y/V/✓ or blank | Heavy dependency |

*Must have either UMUR OR Tanggal Lahir

---

## CORRECT EXAMPLES

### ✅ Valid Data
```
NIK: 3171234567890  | Nama: Ibu Siti      | UMUR: 65 | JK: P | SKRINING: Y | PENGOBATAN: V
NIK: 3171234567891  | Nama: Pak Budi      | UMUR: 72 | JK: L | SKRINING: ✓ | PENGOBATAN: 
NIK: 3171234567892  | Nama: Ibu Dewi      | UMUR: 45 | JK: P | SKRINING:   | PENGOBATAN: Y
NIK: 3171234567893  | Nama: Pak Hendra    | Tgl Lahir: 15/03/1955 | JK: L | SKRINING: Y
```

### ❌ Invalid Data (ROWS WILL BE SKIPPED)
```
❌ NIK: [BLANK]     | Nama: Ibu Rini     | UMUR: 62 | JK: P  → SKIPPED (no NIK)
❌ NIK: 3171234567 | Nama: Pak Joni     | UMUR: 58 | JK: [BLANK] → SKIPPED (no JK)
❌ NIK: 3171234567895 | Nama: Ibu Mira | UMUR: [BLANK] | JK: P | Tgl Lahir: [BLANK] → SKIPPED (no age)
❌ NIK: 3171234567896 | Nama: Pak Rudi | UMUR: "tidak tahu" | JK: L → SKIPPED (age not numeric)
```

---

## SERVICE MARKING

**Any of these mean "Service Provided":**
- ✓ Y, yes, YES, y
- ✓ V, v
- ✓ ✓ (checkmark)
- ✓ X, x, 1
- ✓ True, TRUE

**Blank or "N" = Service NOT provided**

---

## DEPENDENCY LEVELS (Age ≥ 60 only)

| Level | Meaning | Mark |
|-------|---------|------|
| **A** | Mandiri (Independent) | Y/✓ |
| **B** | Ketergantungan Ringan (Light) | Y/✓ |
| **C** | Ketergantungan Berat (Heavy) | Y/✓ |

If person is under 60, leave A/B/C blank.

---

## GENDER VALUES

| Value | Meaning |
|-------|---------|
| **L** | Laki-laki (Male) |
| **P** | Perempuan (Female) |

Only use: L or P (case-insensitive)

---

## BEFORE SUBMITTING - VERIFY ✓

- [ ] File is .xlsx (not .csv or .xls)
- [ ] Every row has NIK (unique)
- [ ] Every row has JK (L or P)
- [ ] Every row has UMUR OR Tanggal Lahir
- [ ] Month/Year in Row 4 is filled (e.g., JANUARI 2024)
- [ ] Puskesmas name in Row 3 is filled
- [ ] District name in Row 2 is filled
- [ ] Service columns use: Y, V, ✓ (not "Yes", "OK", etc.)
- [ ] No blank rows in the middle of data
- [ ] Age values are numeric (65, not "65 tahun")

---

## COMMON MISTAKES ❌

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| Gender: "Male" | Gender: L |
| Age: "65 tahun" | Age: 65 |
| Service: "Ada" | Service: Y or ✓ |
| Date: "03-15-1955" | Date: 15/03/1955 |
| Month: "Januari" | Month: JANUARI 2024 |
| Multiple same NIK | Each NIK unique |

---

## IF YOU'RE UNSURE

1. Ask your supervisor
2. Check `DATA_FORMAT_GUIDE.md`
3. See a working example file

---

**Print this card • Laminate it • Keep it at your desk**

Version 1.0 | February 26, 2026
