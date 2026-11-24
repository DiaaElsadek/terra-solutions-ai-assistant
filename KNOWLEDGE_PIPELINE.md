# Knowledge Data Pipeline (`Knowlege.xlsx` → Canonical JSON)

## Overview

The pipeline converts Terra Solutions' unstandardized multi-sheet Excel workbook and clinic directory into a lossless, row-traceable canonical JSON knowledge base without manual editing or hallucinated enrichment.

---

## Pipeline Stages (`scripts/build-knowledge.py`)

```text
data/raw/Knowlege.xlsx  +  data/raw/clinics.json
                │
                ▼  (Python stdlib XML + zipfile extractor)
  10-sheet cell matrix with true 1-based Excel row numbers
                │
                ▼  (Rule-based entity & table normalization)
  • Individual product/brand extraction (Fillers, Botox, Threads, Skin Boosters, Stimulators)
  • Clinic-to-device cross-linking (Dermadent, One Touch, Well Touch, New Age)
  • Individual Pregnancy & Lactation safety matrix rules
  • Clinical comparisons, dental smile tiers & policies, device capabilities
  • Exact price extraction only when explicitly stated (e.g., AED)
                │
                ▼  (Audit & conflict reconciliation)
  • data/canonical/knowledge.canonical.json (148 records, 4 clinics, 4 conflicts)
  • data/canonical/unresolved.json (0 unmapped rows — must remain [])
  • reports/knowledge-audit.json & reports/knowledge-audit.md
```

---

## Running the Pipeline

```bash
npm run knowledge:build
```

The command reads `data/raw/Knowlege.xlsx` directly from OpenXML (`xl/workbook.xml`, `xl/sharedStrings.xml`, worksheet XML) so it does not require third-party Python Excel dependencies (`openpyxl`) and preserves true 1-based spreadsheet row numbers (`source.row` / `source.rows`).

---

## Latest Data Integrity Audit (`reports/knowledge-audit.md`)

| Metric | Verified Count |
| --- | --- |
| Source Excel Worksheets | `10` |
| Source Non-Empty Rows (`Knowlege.xlsx`) | `448` |
| Extracted Rows (`knowlege-extracted.json`) | `448` |
| Non-Whitespace Cells | `771` |
| Mapped Source Rows | `448` |
| Unmapped Source Rows | `0` |
| Normalized Canonical Records | `148` |
| Consolidated Clinics | `4` |
| Detected Conflicts / Anomalies | `4` |

### Conflict Handling Policy
Contradictions inside `Knowlege.xlsx` (such as filler duration text accidentally copied into Botox row 156, Radiesse duration `12–18` vs `3–12` months, and `Demadent` / `WellTouch` spelling variants) are **not silently overwritten**. They are preserved in `dataset.conflicts` and attached via `conflictNotes` so agents and the AI assistant surface the discrepancy transparently.

---

## Updating Knowledge Data

1. Place the updated workbook in `data/raw/Knowlege.xlsx` (or update `data/raw/clinics.json`). Never store raw workbooks or JSON datasets in `public/`.
2. Run `npm run knowledge:build` and verify `data/canonical/unresolved.json` remains `[]` (`unmappedSourceRows: 0`).
3. Run `npm run eval` and `npm test` to confirm schema validity, provenance completeness, and retrieval regression metrics.
4. Run `npm run build` to verify TypeScript, route types, and clean client bundle isolation.

