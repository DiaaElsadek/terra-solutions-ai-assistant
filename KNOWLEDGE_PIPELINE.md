# Knowledge Data Pipeline (`Knowlege.xlsx` → Canonical JSON & In-Memory Index)

## Overview

The pipeline converts Terra Solutions' unstandardized multi-sheet Excel workbook (`data/raw/Knowlege.xlsx`) and partner clinic directory (`data/raw/clinics.json`) into a lossless, row-traceable canonical JSON knowledge base (`data/canonical/knowledge.canonical.json`) without manual editing or hallucinated enrichment.

---

## 1. Build-Time Extraction Stages (`scripts/build-knowledge.py`)

```text
data/raw/Knowlege.xlsx  +  data/raw/clinics.json
                │
                ▼  (Python stdlib OpenXML + zipfile extractor)
  10-sheet cell matrix with true 1-based Excel row numbers & A1 cell coordinates
                │
                ▼  (Rule-based entity, safety matrix & comparison extraction)
  • Individual product/brand extraction (Fillers, Botox, Threads, Skin Boosters, Stimulators)
  • Clinic-to-device cross-linking (Dermadent, One Touch, Well Touch, New Age)
  • Individual Pregnancy & Lactation safety matrix rules
  • Clinical comparisons, dental smile tiers & policies, device capabilities
  • Exact price extraction only when explicitly stated (e.g., AED)
                │
                ▼  (Audit & conflict reconciliation)
  • data/canonical/knowledge.canonical.json (148 records, 4 clinics, 4 conflicts)
  • data/canonical/sheet-rows.json (raw worksheet row/column index for /api/knowledge lookup)
  • data/canonical/unresolved.json (0 unmapped rows — must remain [])
  • reports/knowledge-audit.json & reports/knowledge-audit.md
```

Command to rebuild from Excel:

```bash
npm run knowledge:build
```

Because `scripts/build-knowledge.py` reads OpenXML directly (`xl/workbook.xml`, `xl/sharedStrings.xml`, worksheet XML) using Python's standard library, it requires no third-party `.xlsx` packages and preserves exact 1-based worksheet row numbers (`source.row` / `source.rows`) and A1 cell references (`cell` / `cellRange`).

---

## 2. Runtime Caching & Zero Per-Request Excel Parsing (`lib/knowledge/server-store.ts`)

- **No `.xlsx` reads during chat requests:** Neither `app/api/chat/route.ts` nor `lib/knowledge/retriever.ts` touches `Knowlege.xlsx`.
- **Single Worker-Level Cache:** `getCanonicalDataset()` validates `data/canonical/knowledge.canonical.json` via `validateCanonicalDataset()` once per worker, caches the normalized dataset in memory, and lazily builds `KnowledgeRetriever`'s BM25 IDF vocabulary + inverted token/alias index (`getKnowledgeCacheMetadata().excelParsedPerRequest === false`).
- **Hot Index Rebuild Hooks:** `triggerKnowledgeIndexRebuild()` clears the worker cache, re-validates canonical data, and invokes registered `registerKnowledgeRebuildListener` callbacks (incrementing `indexBuildCount`) without requiring a process restart.
- **Extensible Document Ingestion (`lib/knowledge/ingestion/pipeline.ts`):** `KnowledgeIngestionPipeline` registers format parsers (`jsonParser`, `csvParser`, `txtParser`), tracks manifests, detects duplicate/conflicting records on `ingestSource()`, supports `deactivateSource()`, and invokes its `onRebuildIndex` hook.

---

## 3. Data Integrity & Known Workbook Quality Findings (`reports/knowledge-audit.json`)

| Metric | Verified Count |
| --- | --- |
| Source Excel Worksheets | `10` |
| Source Non-Empty Rows (`Knowlege.xlsx`) | `448` |
| Extracted Rows (`knowlege-extracted.json`) | `448` |
| Non-Whitespace Cells | `771` |
| Mapped Source Rows | `448` |
| Unmapped Source Rows (`unresolved.json`) | `0` |
| Normalized Canonical Records | `148` |
| Consolidated Partner Clinics | `4` |
| Preserved Conflicts / Anomalies | `4` |

### Audited Spreadsheet Anomalies & Conflicts

1. **`conflict-botox-postcare` (`error`):** Row `156` in `Filler+Botox+Threads` repeats filler duration text (`النتائج تدوم بين 3 شهور إلى 1 سنة، حسب نوع الفلر`) inside a Botox section, contradicting Botox duration (`3–6 months`, rows `132`, `147`, `148`, `162`).
2. **`conflict-radiesse-duration` (`warning`):** `Filler+Botox+Threads` row `96` specifies `12–18 شهر` for Radiesse, whereas row `106` repeats generic `3 شهور إلى 1 سنة` text.
3. **`conflict-clinic-spelling` (`warning`):** `clinics.json` spells `Dermadent` and `Well Touch`, while `Tattoo Removal` row `7` spells `Demadent + Vip` (row `21`: `ديرمادنت`) and `Slimming ` rows `20`/`26` concatenate `WellTouch`.
4. **`conflict-legacy-json-diffs` (`warning`):** `Knowlege.xlsx` supersedes legacy `knowledge.json` across `Filler+Botox+Threads`, `Skin Booster `, and `Facial Machines  ` (e.g., fixes Arabic typo `المضاعفات` vs `المضفات` on row `6`, adjusts `تدريجية` vs `تدريجيًا`, and preserves formatted symbols on Restylane Kysse).

Contradictions inside `Knowlege.xlsx` are **never silently erased** — they are preserved in `dataset.conflicts` and surfaced via `conflictNotes` during retrieval and response rendering.

---

## 4. Safe Knowledge Update Workflow

1. Update `data/raw/Knowlege.xlsx` (or `data/raw/clinics.json`) — never place raw spreadsheets or JSON files in `public/`.
2. Run `npm run knowledge:build` and confirm `data/canonical/unresolved.json` remains `[]`.
3. Update `knowledge/synonyms/arabic-english-synonyms.json` if new services, brands, devices, or colloquial aliases are added.
4. Run `npm test` and `npm run eval` to confirm synonym referential integrity, provenance coverage, and zero retrieval regressions.
5. Run `npm run build` to verify Next.js server/client isolation and bundle cleanliness.
