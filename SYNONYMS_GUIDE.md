# Terra Solutions Bilingual Synonym, Transliteration & Guard Dictionary Guide

## 1. Purpose & Location

The dictionary lives at `knowledge/synonyms/arabic-english-synonyms.json` and is compiled once at server startup by `lib/knowledge/synonyms.ts`.

It bridges real-world call-center agent queries — Egyptian colloquial Arabic, loanword transliterations, mixed Arabizi/English phrasing, and common spelling errors — directly to verified `canonicalId` entries in `data/canonical/knowledge.canonical.json`.

---

## 2. Schema Specification

### `entries` Array (`CanonicalSynonymEntry`)

```json
{
  "canonicalId": "facial-hydrafacial",
  "canonicalName": "Hydrafacial (Basic, Deep, Korean Facial)",
  "relationshipType": "exact_synonym",
  "aliases": [
    "facial",
    "facial treatment",
    "فيشيال",
    "فيشال",
    "فيشيول",
    "فيشل",
    "فشيال"
  ],
  "commonQuestions": [
    "ايه هو الفيشيال"
  ],
  "relatedConcepts": [
    "facial-dermapen",
    "facial-factor-five",
    "facial-peeling"
  ],
  "confidence": 1.0
}
```

| Field | Allowed Values / Type | Purpose |
| --- | --- | --- |
| `canonicalId` | Exact ID in `knowledge.canonical.json` | Target verified record; validated automatically by unit tests. |
| `relationshipType` | `exact_synonym` \| `transliteration` \| `common_typo` \| `related_service` \| `parent_category` | Controls boost weight (`parent_category` is gentler so broad concepts such as pregnancy overviews never override specific service rules). |
| `aliases` | `string[]` | Normalized English phrases, Arabic terms, Egyptian colloquial transliterations, and curated typos. |
| `commonQuestions` | `string[]` | Reference call-center formulations for documentation & evaluation traceability. |
| `relatedConcepts` | Valid `canonicalId[]` | Cross-linked alternatives, clinics, or safety records. |
| `confidence` | `number` (`0.0–1.0`) | Multiplier applied to entity-resolution boosts inside `KnowledgeRetriever`. |

### `unsupportedCompoundGuards` Array (`UnsupportedCompoundGuard`)

Used for misleading multi-word requests that combine two real documented words (`Botox` + `Hair`) into an undocumented service (`بوتوكس الشعر` / `Hair Botox`):

```json
{
  "id": "hair-botox-unsupported",
  "patterns": ["بوتوكس الشعر", "بوتكس الشعر", "hair botox", "botox for hair"],
  "reasonAr": "...",
  "reasonEn": "..."
}
```

When `matchUnsupportedCompound()` matches any pattern, retrieval immediately abstains (`confidence: "none"`, `results: []`) before token matching can falsely return injectable Botox or Dr. CYJ Hair Filler.

---

## 3. Rules for Adding or Modifying Synonyms Safely

1. **Always link only to verified canonical IDs:** Never invent concepts or map to non-existent records. Run `npm test` to verify referential integrity across all `canonicalId` and `relatedConcepts` values.
2. **Never map ambiguous family names to a single variant:** Keep bare multi-product family names (like bare `"Juvederm"`) out of single-product `exact_synonym` entries so ambiguity detection (`Juvederm` → clarification across Voluma / Volux / Ultra 4) continues to work cleanly.
3. **Never map broad nouns to a specific instance:** Do not map generic `"clinic"` / `"عيادة"` to a single clinic (e.g., `"dermadent"`), and mark multi-service overview tables (`pregnancy-lactation-overview`, `device-roblex-body-face-contouring`) as `parent_category`.
4. **Do not include short ambiguous 2–3 character tokens as fuzzy targets:** Tokens `< 4` characters never use edit-distance expansion (`lib/knowledge/transliteration.ts`). If an acronym is essential (`PRP`, `PDO`, `TCA`, `CYJ`), add it explicitly to `SHORT_DOMAIN_ACRONYMS` or `aliases`.
5. **Pair every dictionary change with evaluation cases:** Add realistic Arabic/English/mixed test phrasing to `evaluation/questions.json` and `evaluation/expected-results.json`, then run `npm run eval`.

