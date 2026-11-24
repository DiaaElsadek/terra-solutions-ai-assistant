# Knowledge Base Schema & Retrieval Architecture

## Single Source of Truth (`data/canonical/knowledge.canonical.json`)

All confidential source files now reside exclusively outside `public/` under server-only `data/`:

- `data/raw/Knowlege.xlsx` — Primary authoritative Excel workbook (**10 worksheets**, **448 non-empty rows**, **771 non-whitespace cells**).
- `data/raw/clinics.json` — Official clinic list (`Dermadent`, `One Touch`, `Well Touch`, `New Age`).
- `data/raw/knowlege-extracted.json` & `data/raw/knowledge.json` — Archived legacy exports reconciled during canonicalization.
- `data/canonical/knowledge.canonical.json` — Consolidated, validated canonical dataset containing **148 records**, **4 canonical clinics**, and **4 documented conflict records**.

---

## Canonical Interfaces (`types/knowledge.ts`)

```ts
export type KnowledgeCategory =
  | "fillers" | "botox" | "threads" | "body-fillers" | "laser"
  | "hair-treatments" | "face-treatments" | "skin-boosters" | "facial"
  | "tattoo-removal" | "pregnancy-safety" | "slimming" | "facial-machines"
  | "dental" | "clinics";

export type KnowledgeRecordType =
  | "product" | "service" | "device" | "clinic"
  | "safety-rule" | "comparison" | "policy" | "overview";

export interface KnowledgeSourceRef {
  file: string;
  sheet: string;
  rawSheet?: string;
  row: number;     // Primary 1-based Excel row number (0 for consolidated clinics)
  rows: number[];  // All exact 1-based Excel rows mapped to this record
}
```

Every `KnowledgeRecord` stores normalized `name`, `aliases`, `description`, structured `attributes`, non-fabricated `prices`, linked `clinicIds`, optional `safetyFlags`, `source` provenance, `language` (`"ar" | "en" | "mixed"`), and `conflictNotes` when source contradictions exist.

---

## Runtime Validation (`lib/knowledge/validator.ts`)

`getCanonicalDataset()` (`lib/knowledge/server-store.ts`) enforces:
1. Server-only execution guard (`typeof window !== "undefined"` throws `[Terra Security]`).
2. `validateCanonicalDataset(dataset)` verifying unique `id`, valid `category`, valid `recordType`, non-empty `source.file` / `source.sheet` / `source.rows`, and non-empty `clinics`.

---

## Bilingual Modular Retrieval Pipeline (`lib/knowledge/`)

1. **`normalize.ts`**: Converts Arabic-Indic digits (`٠-٩` → `0-9`), strips Arabic diacritics/tatweel, normalizes alef/teh-marbuta/alef-maksura, detects `ar | en | mixed`, and filters stop words while keeping short medical acronyms (`HA`, `RF`, `CO2`, `PRP`, `PDO`, `CYJ`, `AED`).
2. **`intent.ts`**: Classifies queries across intents (`greeting`, `catalog_overview`, `device_specs`, `price_offer_lookup`, `clinic_lookup`, `comparison`, `safety_pregnancy`, `medical_diagnosis`, `call_script`, `company_info`, `product_service_lookup`, `unknown`), detects Terra clinic hints (`clinics`), detects unknown named clinics (`Cairo Star Clinic`), and identifies medical diagnosis/prescription requests.
3. **`synonyms.ts`**: Maps bilingual Arabic/Egyptian-Arabic/English synonyms and common misspellings (`sculptera` → `sculptra`, `juviderm` → `juvederm`, `radiese` → `radiesse`, `botoks` → `botox`, `بلازما` ↔ `prp`, `بترضع` ↔ `lactation`).
4. **`retriever.ts`**: Pre-indexes normalized text and Latin fuzzy vocabulary once per server worker, scores each token via max-field weight + bounded corroboration + single-best synonym bridge + Levenshtein typo fallback, penalizes generic modifiers when no domain entity matches, calibrates confidence (`strong | partial | ambiguous | none`), flags ambiguity requiring clarification, expands related records (`clinicIds`, pregnancy rules, category overviews), and surfaces source conflict notices.
