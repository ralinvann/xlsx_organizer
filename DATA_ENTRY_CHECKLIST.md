# 📋 EXCEL FILE CHECKLIST - DATA ENTRY STAFF

## BEFORE YOU SUBMIT YOUR EXCEL FILE

Print this checklist and verify each item ✓

### STEP 1: File Structure (Hidden Rows)
- [ ] Row 2, Column C: Contains district name (e.g., "DKI JAKARTA")
- [ ] Row 3, Column C: Contains health center name (e.g., "Puskesmas Cilandak")
- [ ] Row 4, Column C: Contains month and year (e.g., "JANUARI 2024", "FEBRUARI 2024")
- [ ] Rows 1-5 are hidden from normal view
- [ ] First data row starts at Row 6

### STEP 2: Column Headers (Row 6)
Your headers should have (at minimum):
- [ ] **NIK** - National ID number column
- [ ] **Nama** - Full name column
- [ ] **UMUR** - Age column (OR Tanggal Lahir for birth date)
- [ ] **JK** - Gender column (L or P)

Optional but recommended:
- [ ] **SKRINING** - Screening service column
- [ ] **PENGOBATAN** - Treatment service column
- [ ] **PENYULUHAN** - Health education column
- [ ] **PEMBERDAYAAN** - Empowerment column
- [ ] **A** - Independence level A column
- [ ] **B** - Independence level B column
- [ ] **C** - Independence level C column

### STEP 3: Data Entry (Rows 7+)
For EVERY row:
- [ ] **NIK**: No blank values, each person has different NIK
- [ ] **Nama**: Full name (can be blank if necessary)
- [ ] **UMUR**: Numeric age in years (e.g., 65, 72, 45)
  - OR **Tanggal Lahir**: Date in DD/MM/YYYY format (e.g., 15/03/1955)
  - (You need ONE of these, system calculates age)
- [ ] **JK**: Only "L" (Laki-laki) or "P" (Perempuan)

For Service columns (checkmark with Y, V, or similar):
- [ ] **SKRINING**: Mark with Y/V/✓ if service provided, leave blank if not
- [ ] **PENGOBATAN**: Mark with Y/V/✓ if service provided, leave blank if not
- [ ] **PENYULUHAN**: Mark with Y/V/✓ if service provided, leave blank if not
- [ ] **PEMBERDAYAAN**: Mark with Y/V/✓ if service provided, leave blank if not

For Elderly (Age ≥ 60) ONLY:
- [ ] **A**: Mark with Y/V/✓ if independent (Mandiri)
- [ ] **B**: Mark with Y/V/✓ if light dependency
- [ ] **C**: Mark with Y/V/✓ if heavy dependency

### STEP 4: Data Quality
- [ ] No blank rows between the header and data
- [ ] All data is in the same worksheet
- [ ] No hidden columns in the middle of data
- [ ] If you have merged header cells (e.g., "SKRINING" spanning columns), that's OK - system handles it
- [ ] File is saved as Excel (.xlsx format)
- [ ] No special characters in column names (use: A, B, C or Skrining, Pengobatan, etc.)

### STEP 5: Final Verification
Before clicking "Submit":
- [ ] Did you fill in Kabupaten (District)?
- [ ] Did you fill in Puskesmas (Health Center)?
- [ ] Did you fill in Month/Year correctly? (e.g., "JANUARI 2024")
- [ ] Count of records: _________ (rough count)
- [ ] Any fields that are completely empty across all rows?
  - If YES, list them: _____________________
- [ ] Do you have at least 3 records of test data?

---

## COMMON MISTAKES TO AVOID ❌

| ❌ WRONG | ✅ CORRECT |
|---------|-----------|
| Blank NIK in some rows | Every row has a unique NIK |
| Age written as "65 tahun" | Just the number: 65 |
| Gender values: "Laki" or "Male" | Only: L or P |
| Service marking: "Ada", "OK", "Done" | Only: Y, V, ✓, or blank |
| Month written as "Jan" or "1/2024" | Full format: JANUARI 2024 |
| Multiple people with same NIK | Each person has unique NIK |
| Merged cells without header labels | Merged cells are OK if labeled |
| Blank rows in the middle of data | Remove all blank rows |
| .csv or .xls format | Must be .xlsx (Excel 2007+) |

---

## FIELD DEFINITIONS QUICK GUIDE

### NIK (National ID)
- Format: 16 digits
- Example: 3171234567890012
- MUST be unique (one per person)

### Nama (Name)
- Full name of elderly person
- Example: Ibu Siti Aminah

### UMUR (Age)
- Current age in years
- Examples: 65, 72, 45
- ALTERNATIVE: Use Tanggal Lahir instead

### Tanggal Lahir (Birth Date)
- Date of birth in DD/MM/YYYY
- Examples: 15/03/1955, 22/07/1948
- System will calculate age automatically
- ALTERNATIVE: Use UMUR instead

### JK (Gender)
- L = Laki-laki (Male)
- P = Perempuan (Female)
- Case-insensitive (l or L both work)
- REQUIRED - cannot be blank

### Service Columns (SKRINING, PENGOBATAN, PENYULUHAN, PEMBERDAYAAN)
- Mark service provided: Y, Yes, V, ✓, 1, X
- No service: Leave blank or N
- System understands all formats

### A, B, C (Independence Levels) - Only for age ≥ 60
- A (Mandiri): Independent
- B (Ketergantungan Ringan): Light dependency  
- C (Ketergantungan Berat): Heavy dependency
- Leave blank if not applicable

---

## EXAMPLE: CORRECT FILE STRUCTURE

```
Row 1: [Empty or title]
Row 2: [Hidden] | B2: KABUPATEN: | C2: DKI JAKARTA
Row 3: [Hidden] | B3: PUSKESMAS: | C3: Puskesmas Cilandak
Row 4: [Hidden] | B4: BULAN: | C4: JANUARI 2024
Row 5: [Hidden] | [Empty]

Row 6: NIK | Nama | UMUR | JK | SKRINING | PENGOBATAN | PENYULUHAN | PEMBERDAYAAN | A | B | C
Row 7: 3171234567890 | Ibu Siti Aminah | 65 | P | Y | Y | | Y | Y | | 
Row 8: 3171234567891 | Pak Budi Santoso | 72 | L | Y | | Y | | | Y | 
Row 9: 3171234567892 | Ibu Dewi Sari | 45 | P | | | | | | | 
Row 10: ...
```

---

## CONTACT SUPPORT

If you have questions about the format:
1. Check the **DATA_FORMAT_GUIDE.md** file
2. Ask your team lead to verify
3. Contact system administrator

**Remember**: 
- ✅ NIK is CRITICAL - every row must have it
- ✅ JK (Gender) is CRITICAL - every row must have it  
- ✅ UMUR or Tanggal Lahir is CRITICAL - every row must have at least one

If any of these three are missing from a row, that entire row will be skipped!

---

**Version**: 1.0  
**Last Updated**: February 26, 2026
