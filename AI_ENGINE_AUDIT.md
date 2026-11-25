# Terra Solutions AI Engine — Architecture Audit & Root Cause Analysis

## 1. Current Pipeline Overview
The existing server pipeline executes:
`Employee Question -> resolveContextualQuery() -> knowledgeRetriever.retrieve() -> buildContextPackage() -> Gemini (with retry) / localFallbackProvider -> AIResponseRenderer`.

While strong structural foundations exist (server-only knowledge isolation, PII redaction, schema validation, and Excel row traceability via `data/canonical/knowledge.canonical.json`), real-world call center phrasing reveals substantial retrieval gaps.

---

## 2. Observed Root Causes of Poor Query Understanding

### 2.1 Arabic Definite Article (`الـ`) & Proclitic Prefixes
- `lib/knowledge/normalize.ts` strips tashkeel, tatweel, and normalizes `أ/إ/آ`, `ة`, `ى`, but **does not normalize Arabic definite articles (`ال`) or proclitic prefixes (`وال`, `بال`, `لل`, `كال`, `فال`)**.
- Example failure (`"ايه هو الفيشيال؟"`): `tokenizeQuery` outputs `["الفيشيال"]`. Because `synonyms.ts` only keys `"فيشال"` (no `"الفيشيال"`, no `"فيشيال"`), `expandSynonyms(["الفيشيال"])` returns `[]` and retrieval fails (`confidence = "none"`).
- Example failure (`"تفاصيل الـ Facial."`): Stripping tatweel reduces `"الـ"` to token `"ال"`, which is absent from `STOP_WORDS`, adding a junk token `"ال"` that halves query token coverage.

### 2.2 Unrecognized Egyptian Colloquial Question Phrasing
- Colloquial phrasing such as `"يعني ايه"`, `"بتعملوا"`, `"بيستخدم في ايه"`, `"عبارة عن"`, `"مميزاته"`, `"عيوبه"`, `"انهي احسن"`, `"عند مين"`, `"بتاع"`, `"الفرق"`, and `"ينفع"` is missing from `STOP_WORDS` / conversational strip rules, causing conversational words to behave as required entity tokens.

### 2.3 Arabic Phonetic Transliteration & Cross-Script Gaps
- Employees frequently spell English procedures phonetically with vowel substitutions (`فيشيال`, `فيشال`, `فيشيول`, `فيشيل`, `فيشل`, `فشيال`, `بوتكس`, `فلر`, `فيلرز`, `لازر`, `سكين بوستر`, `بادي كونتورنج`, `فينيير`, `جوفدرم`, `اندوليفت`).
- Previously, `synonyms.ts` contained only a small flat key-value map (`Record<string, string[]>`), detached from canonical record IDs and without transliteration coverage or relationship distinctions (`exact_synonym` vs `transliteration` vs `related_service` vs `parent_category`).

### 2.4 Latin-Only Typo Tolerance
- `retriever.ts` restricts `isFuzzyTokenMatch()` strictly to `[a-z]+` tokens (`length >= 5`). Arabic misspellings and common 4-5 letter English typos (`botx`, `filer`, `tatoo`, `lazer`, `facail`, `faciel`) are either unhandled or missed unless manually hardcoded.

### 2.5 Ambiguous, Compound-Negative & Multi-Entity Gaps
- Compound unsupported concepts such as `"بوتوكس الشعر"` (Hair Botox) contain the substring `"بوتوكس"`, risking silent mismatch against injectable `botox-overview` / `botox-botox-100-unit` even though Hair Botox does not exist in Terra's approved knowledge files.
- Comparison queries (`"ايه الفرق بين Facial و Skin Booster؟"`) lack explicit dual-entity guaranteed selection, allowing variants of one service to push the second option out of top results.
- Vague queries (`"عايز اعرف الجلسة."`) lack explicit clarification prompts when no active service entity is specified.

### 2.6 Limited Conversation Follow-up State
- `context-query.ts` relies on a tiny static `ENTITY_HINT_WORDS` regex and naively concatenates extracted words without tracking active category/entity/comparison state or detecting topic switches (e.g., asking follow-ups like `"طب سعره كام؟"` -> `"وفيه أنواع تانية؟"` -> `"طب ايه الفرق بينهم؟"`).

### 2.7 Excel Caching, Ingestion & Evaluation Scope
- `server-store.ts` already avoids reading `.xlsx` at request time (using `knowledge.canonical.json` and lazy-cached `sheet-rows.json`), yet lacks a unified startup index version/metadata tracker, canonical JSON synonym loading, and dynamic corpus IDF/BM25 weighting.
- Existing `evaluation/questions.json` contains 56 cases — insufficient to rigorously measure Egyptian colloquialisms, multi-variant Arabic transliterations, controlled typo boundaries, multi-turn follow-ups, and false-positive rates (target: `100+` curated cases).

