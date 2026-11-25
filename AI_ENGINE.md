# Terra Solutions AI Engine & Hybrid Retrieval Architecture

> **Product Identity:** Internal call-center & customer-support intelligence platform exclusively branded as **Terra Solutions Assistant**. Upstream LLM provider/model details remain strictly server-side.

## 1. End-to-End Query Processing Flow

```text
Employee Message + Recent Conversation Turns
   │
   ▼  lib/knowledge/context-query.ts (resolveContextualQuery)
Contextual Entity Resolution & Topic-Shift Guard
   │
   ▼  lib/knowledge/query-expander.ts (buildExpandedQueryPlan)
   ├── normalize.ts (Digits, Diacritics, Tatweel, Elongation, Stop-Words, Arabic Prefixes)
   ├── intent.ts (12 Intents, Broad Category Hints, Ambiguity & Clinic Guards)
   └── synonyms.ts + transliteration.ts (Unsupported Compound Guard, Canonical Entity Hints,
                                         Arabic Phonetic Skeleton, Controlled Damerau-Levenshtein)
   │
   ▼  lib/knowledge/retriever.ts (KnowledgeRetriever.retrieve)
In-Memory Pre-Indexed Hybrid Retrieval (BM25 IDF + Field Weights + Entity Hints + Comparison Merge)
   │
   ├── confidence === "none" (or unsupportedCompound / medical_diagnosis / unknownClinic)
   │      └─► Honest Abstention + Missing-Data Notice (zero fabricated claims)
   ├── requiresClarification === true
   │      └─► Targeted Clarification Question + Verified Candidate List
   └── Strong / Partial Grounded Match
          │
          ▼  lib/ai/prompt-builder.ts (buildContextPackage — max 7,500 chars)
       Primary Generation (lib/ai/gemini-provider.ts + terra-system-prompt.ts v3.0.0)
          │   ├── Server-side JSON validation + 1 corrective retry on malformed output
          │   └── Strict verified-source pruning (strips hallucinated source IDs & unsafe HTML)
          └── Automatic Graceful Fallback (lib/ai/providers/local-fallback-provider.ts)
                  Returns identical RichAIResponse JSON contract + Markdown rendering
```

---

## 2. Arabic, Colloquial Egyptian & English Normalization (`lib/knowledge/normalize.ts`)

1. **Digit & Orthographic Normalization (`normalizeText`):**
   - Converts Arabic-Indic numerals (`٠-٩`) via `normalizeDigits` to ASCII (`0-9`).
   - Removes Arabic diacritics (`\u064B-\u065F\u0670`) and tatweel (`\u0640`).
   - Normalizes Alef variants (`أ/إ/آ/ٱ` → `ا`), Teh Marbuta (`ة` → `ه`), and Alef Maksura (`ى` → `ي`).
   - Collapses expressive character elongation of 3+ identical characters (`/(.)\1{2,}/g → "$1"`, e.g., `فييييشيال` → `فيشيال`).
2. **Safe Arabic Definite Prefix Stripping (`stripArabicPrefix`):**
   - Strips leading definite/proclitic prefixes (`وال`, `بال`, `كال`, `فال`, `ولل`, `لل`, `ال`) inside `tokenizeQuery()` while keeping the root intact inside `normalizeText()` and protecting roots starting with `ال` (`الوان`, `الم`, `الله`, `الام`, `اليه`, `الي`, `الات`, `اليات`).
   - Handles mixed forms like `تفاصيل الـ Facial.` cleanly by discarding orphan `ال` particles.
3. **Egyptian Colloquial Filler Filtering (`STOP_WORDS`):**
   - Filters non-discriminative spoken framing (`ايه`, `يعني`, `عباره`, `بتعملوا`, `بيستخدم`, `عشان`, `ازاي`, `عايز`, `عايزة`, `قولي`, `مميزات`) so primary entity tokens drive retrieval relevance.

---

## 3. Phonetic Transliteration & Controlled Typo Recovery (`lib/knowledge/transliteration.ts`)

1. **Arabic Phonetic Consonant Skeleton (`arabicPhoneticSkeleton`):**
   - Maps consonant ambiguities common in Arabic medical/cosmetic loanwords: `پ→ب`, `ڤ→ف`, `گ/ق→ك`, `ط→ت`, `ص/ث→س`, `ذ/ظ→ز`, `ض→د`, `چ→ج`.
   - Collapses internal vowel carriers (`ا/و/ي/ه`) and consecutive duplicate consonants, so `فيشيال`, `فيشال`, `فيشيول`, `فيشيل`, `فيشل`, `فشيال`, and `الفيشيال` produce the exact same phonetic skeleton and map deterministically to `facial-hydrafacial`.
2. **Controlled Damerau-Levenshtein Typo Guard (`findControlledTypoMatch`):**
   - Tokens under `4` characters (`< 4`) never trigger fuzzy matching.
   - `4`-character tokens require the same first character and only match 4-char transpositions (exact character multiset) or 5-char single omissions (e.g., `botx` → `botox`), blocking unrelated 1-letter substitutions such as `cars` → `care` or `cart` → `part`.
   - Tokens of length `5–7` allow edit distance `<= 1` (`facail`, `faciel`, `lazer`, `tatoo`), and `8+` allow `<= 2` (`sculptera`, `juviderm`).

---

## 4. Intent Classification, Broad Categories & Guards (`lib/knowledge/intent.ts`)

- Classifies every query into 12 explicit intents (`greeting`, `catalog_overview`, `device_specs`, `price_offer_lookup`, `clinic_lookup`, `comparison`, `safety_pregnancy`, `medical_diagnosis`, `call_script`, `company_info`, `product_service_lookup`, `unknown`).
- **Broad Category Discovery (`broadCategoryHints`):** Recognizes Egyptian & English category asks (e.g., `ايه خدمات البشرة عندكم؟`, `ايه خدمات الليزر؟`, `ايه أجهزة العيادات؟`, `ايه خدمات التخسيس عندكم؟`) and balances top results across departments.
- **Underspecified Generic Clarification (`isAmbiguousGeneric`):** Queries without a specific product/service (`عايز اعرف الجلسة.`) ask a clarification question instead of guessing a service.
- **Medical & Clinic Safety Guards:** Prescription/diagnosis queries (`diagnose`, `prescribe`, `تشخيص`, `روشتة`) and unknown partner clinic names (`unknownClinicRequested`) trigger immediate `confidence: "none"` abstention.

---

## 5. Multi-Turn Conversation State & Topic-Shift Protection (`lib/knowledge/context-query.ts`)

- Inspects the last 6 conversation turns to track `ConversationState` (`activeEntities`, `activeCanonicalIds`, `activeClinics`, `asksVariants`).
- Attaches prior anchors cleanly for pronouns and short follow-ups (`طب سعره كام؟`, `وفيه أنواع تانية؟`, `طب مسموح للحامل؟`, `موجودة فيها أجهزة تاتو؟`, `طب ايه الفرق بينهم؟`).
- Resets stale context automatically whenever a user explicitly names a new canonical entity (e.g., switching from Facial to Skin Booster via `طب ايه هو السكين بوستر؟`).

---

## 6. Knowledge Grounding & Deterministic Fallback (`lib/ai/`)

- `lib/ai/prompts/terra-system-prompt.ts` (`TERRA_PROMPT_VERSION = "3.0.0"`): Enforces strict Excel/JSON grounding, explicit missing-price disclosure (`MISSING_PRICE_MESSAGES`), strict unsupported-compound rejection (`بوتوكس الشعر`), and structured `RichAIResponse` JSON blocks (`heading`, `badge`, `metric`, `table`, `list`, `callout`, `paragraph`, `source_list`, `divider`).
- `lib/ai/gemini-provider.ts`: Resolves server keys (`GOOGLE_AI_API_KEY`, `GEMINI_API_KEY`, `API_KEY`), performs up to 1 retry on transient rate-limit/timeout and 1 corrective retry on invalid JSON, prunes any fabricated source IDs via `validateModelRichResponse` + `mergeVerifiedMessageSources`, and fails over seamlessly to `localFallbackProvider` on outage, rate limit, or missing credentials.

