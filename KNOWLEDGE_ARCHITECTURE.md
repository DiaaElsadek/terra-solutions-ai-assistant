# Knowledge Architecture & Ingestion System

## Authoritative Sources & Immutability

Original company knowledge files live exclusively in private server directory `data/raw/` (never in `public/`):
- `data/raw/Knowlege.xlsx` (preserved immutable; `10` sheets, `448` non-empty rows, `771` non-whitespace cells)
- `data/raw/clinics.json` (`Dermadent`, `One Touch`, `Well Touch`, `New Age`)
- `data/raw/knowlege-extracted.json` & `data/raw/knowledge.json` (legacy extracts audited against the workbook)

---

## Canonical Knowledge Format ([data/canonical/knowledge.canonical.json](file:///F:/Terra%20Solutions/terra-solutions-chatbot/data/canonical/knowledge.canonical.json))

Built deterministically via `npm run knowledge:build` (`scripts/build-knowledge.py`):
- Top-level `schemaVersion: "1.0.0"`, `knowledgeBase` manifest (`id: "terra-main"`, `language: ["ar", "en"]`, `lastUpdated`, and `sources` array containing `sourceId`, `fileName`, `fileType`, `status`, `version`, `importDate`, `rowCount`).
- Every record (`148` canonical records, `448/448` Excel rows mapped, `0` unmapped in `unresolved.json`) retains `status: "active"`, `source.sourceId`, `source.file`, `source.sheet`, and exact 1-based `source.row` / `source.rows`.
- Preserves raw AED prices, medical units, age limits, and `4` explicit conflict disclosures without silent overwriting.

---

## Modular Retrieval Pipeline

1. **Follow-up Context Resolution (`lib/knowledge/context-query.ts`):** Resolves anaphoric queries (e.g., `"طب قارنلي بين أول جهازين"`) by extracting product/device anchors from recent turns, then running fresh retrieval against the canonical KB.
2. **Normalization (`lib/knowledge/normalize.ts`):** Handles Arabic diacritics, alef/teh-marbuta forms, Arabic-Indic digits (`٠-٩`), and bilingual tokenization.
3. **Intent & Unknown-Clinic Detection (`lib/knowledge/intent.ts`):** Classifies product, pricing, device, clinic, comparison, pregnancy safety, call script, and unsupported medical diagnosis requests, plus nonexistent clinics.
4. **Indexed Scoring & Linking (`lib/knowledge/retriever.ts`):** Excludes `"inactive"`/`"archived"` records by default, calibrates `strong | partial | ambiguous | none` confidence, links related clinics and pregnancy rules, and attaches conflict warnings.

---

## Extensible Ingestion Pipeline (`lib/knowledge/ingestion/`)

Architectural flow:
`Source File -> Parser -> Normalizer -> Validator -> Canonical Records -> Knowledge Index`

- **`types.ts` & `pipeline.ts`:** `KnowledgeIngestionPipeline` tracks `KnowledgeSourceManifest` records across versions, supports runtime CSV/JSON/TXT parsing in pure TypeScript, accepts custom binary parsers via `registerParser()` for future `.xlsx`/`.xls`/`.pdf`/`.docx` adapters, flags cross-source content conflicts instead of overwriting, and supports `deactivateSource(sourceId)` + index rebuild callbacks.
- *Scope note:* No unauthenticated web upload UI is exposed in this release; `.xlsx` batch ingestion uses `npm run knowledge:build`.

