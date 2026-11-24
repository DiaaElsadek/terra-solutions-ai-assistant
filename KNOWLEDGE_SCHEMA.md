# Knowledge Base Schema & Data Pipeline

## Source Data (`public/data/knowledge.json`)

The knowledge base is driven directly by the company's Excel export stored at `public/data/knowledge.json`.
It contains **10 worksheet keys** representing aesthetic, dermatological, slimming, laser, and dental operations:

1. `Filler+Botox+Threads`
2. `Laser `
3. `Hair+face Treatments  `
4. `Skin Booster `
5. `Facial `
6. `Tattoo Removal`
7. `pregnancy and lactation`
8. `Slimming `
9. `Facial Machines  `
10. `Dental`

Each sheet is structured as a 2D array of strings (`string[][]`) containing a mix of section headers, tabular product rows, multi-row continuations, sparse columns, and Arabic/English instructional text.

---

## Normalized Record Schema (`types/knowledge.ts`)

`lib/knowledge/parser.ts` normalizes raw rows into `KnowledgeRecord` objects:

```ts
export interface KnowledgeRecord {
  id: string;
  category: KnowledgeCategory;
  subcategory?: string;
  title: string;
  titleEn?: string;
  content: string; // Markdown-formatted text and GFM tables
  tags: string[];  // Bilingual domain + product keywords
  language: "ar" | "en" | "mixed";
  source: {
    sheet: string;
    rowRange: [number, number];
  };
  metadata?: Record<string, string>;
}
```

---

## Search & Retrieval (`lib/knowledge/index.ts`)

- **Arabic Normalization:** Strips diacritics (tashkeel) and normalizes `أ/إ/آ -> ا`, `ة -> ه`, `ى -> ي`.
- **Bilingual Synonym Bridge:** Expands English queries to Arabic domain terms and vice versa (e.g., `pregnancy` ↔ `حمل`, `fillers` ↔ `فيلر`, `devices` ↔ `أجهزة`, `clinics` ↔ `عيادات`).
- **Typo Tolerance:** Common misspellings (`juviderm`, `botoks`, `removel`, `dermaden`) and single-character English typos are matched via edit-distance scoring.
- **Weighted Ranking:** Prioritizes title phrase matches (`+20`), title tokens (`+8`), tags (`+5`), content (`+4`), and category descriptions (`+3`).
- **Source Attribution:** Every returned record preserves its original Excel sheet name and row span.

---

## How to Add or Update Knowledge

1. Export updated worksheets to JSON matching the `Record<string, string[][]>` format.
2. Replace `public/data/knowledge.json` with the updated export.
3. If a new worksheet name is added:
   - Add a `KnowledgeCategory` ID in `types/knowledge.ts`.
   - Register the worksheet mapping and display metadata in `lib/knowledge/categories.ts`.
   - Add major topic patterns in `lib/knowledge/parser.ts` if the sheet contains multiple distinct services.
4. Rebuild (`npm run build`) to validate types and bundle the updated knowledge base.

