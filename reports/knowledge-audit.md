# Knowledge Base Data Integrity Audit

**Generated:** 2026-11-24T20:43:11.853055+00:00
**Canonical Dataset:** `data/canonical/knowledge.canonical.json`

## Summary Metrics

| Metric | Count |
| --- | --- |
| Source Excel Worksheets | 10 |
| Source Non-Empty Rows (`Knowlege.xlsx`) | 448 |
| Extracted Rows (`knowlege-extracted.json`) | 448 |
| Non-Whitespace Cells | 771 |
| Mapped Source Rows | 448 |
| Unmapped Source Rows | 0 |
| Normalized Canonical Records | 148 |
| Consolidated Clinics (`clinics.json` + Excel) | 4 |
| Detected Conflicts / Anomalies | 4 |

## Sheet Coverage Breakdown

| Sheet | Non-Empty Rows | Mapped Rows | Unmapped Rows |
| --- | --- | --- | --- |
| `Filler+Botox+Threads` | 113 | 113 | 0 |
| `Laser ` | 19 | 19 | 0 |
| `Hair+face Treatments  ` | 63 | 63 | 0 |
| `Skin Booster ` | 58 | 58 | 0 |
| `Facial ` | 24 | 24 | 0 |
| `Tattoo Removal` | 27 | 27 | 0 |
| `pregnancy and lactation` | 23 | 23 | 0 |
| `Slimming ` | 51 | 51 | 0 |
| `Facial Machines  ` | 43 | 43 | 0 |
| `Dental` | 27 | 27 | 0 |

## Detected Conflicts & Anomalies

- **[ERROR] Botox post-care duration copy-paste error:** Row 156 under Botox in 'Filler+Botox+Threads' repeats filler aftercare ('النتائج تدوم بين 3 شهور إلى 1 سنة، حسب نوع الفلر'), contradicting Botox durability of 3–6 months (R132, R147, R148, R162).
- **[WARNING] Radiesse durability discrepancy:** Radiesse R96 specifies '12–18 شهر', whereas R106 repeats generic filler post-care '3 شهور إلى 1 سنة'.
- **[WARNING] Clinic spelling variants across files:** 'clinics.json' lists 'Dermadent' and 'Well Touch'; 'Tattoo Removal' R7 writes 'Demadent + Vip' and R21 'ديرمادنت', while 'Slimming ' R20/R26 writes 'WellTouch'.
- **[WARNING] Legacy knowledge.json diffs vs. Knowlege.xlsx:** Original Knowlege.xlsx fixes 'المضاعفات' (vs typo 'المضفات' in legacy knowledge.json Facial Machines R6), has 'تدريجية' vs 'تدريجيًا' (Skin Booster), and includes Wingdings bullet 0xf0b7 on Restylane kysse.

## Unmapped Rows

None (all `448` non-empty rows across all `10` sheets were mapped to canonical records).
