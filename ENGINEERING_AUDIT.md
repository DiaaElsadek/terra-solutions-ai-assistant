# Terra AI Assistant — Complete Engineering Audit

**Audit Date:** 2026-11-24  
**Scope:** Full repository inspection (`app/`, `components/`, `hooks/`, `lib/`, `constants/`, `types/`, `public/data/`, `next.config.ts`, `package.json`, and existing markdown docs).

---

## 1. Executive Summary & Existing Architecture

Terra AI Assistant is a Next.js `16.4.6` (App Router, `cacheComponents: true`, `partialPrefetching: true`), React `19.3.0`, TypeScript `5` (strict mode), Tailwind CSS `4.3.3` application structured across route groups:
- `app/(marketing)/`: Landing (`/`), Sign In (`/signin`), Sign Up (`/signup`).
- `app/(chat)/`: Protected Chat Workspace (`/chat` wrapped in client-side `AuthGuard`).
- `app/api/chat/route.ts`: Prepared API stub returning HTTP `501`.
- Client-side domain modules in `lib/knowledge/`, `lib/ai/`, `lib/auth/`, `lib/storage/`, and `lib/search/`.

While the UI, brand tokens (`#0D0B07` / `#161209` / `#CBB36A`), Lucide iconography, and `localStorage` conversation CRUD are clean and build cleanly, the codebase currently operates as a **client-side prototype** with **critical security exposure**, **lossy/coarse data normalization**, **no live LLM integration**, and **no automated test or retrieval evaluation suite**.

---

## 2. Prioritized Findings

### Critical Severity

1. **Confidential Company Knowledge Exposed Publicly (`public/data/` + Client Bundles)**
   - **Evidence:** `public/data/Knowlege.xlsx`, `public/data/knowledge.json`, `public/data/knowlege-extracted.json`, and `public/data/clinics.json` reside in `public/data/`, making all raw company data publicly downloadable over HTTP (`/data/Knowlege.xlsx`, `/data/knowledge.json`, etc.). `AuthGuard` in `components/auth/AuthGuard.tsx` only runs in the browser on `/chat` and provides zero protection for `public/`.
   - **Evidence:** `lib/knowledge/index.ts` imports `@/public/data/knowledge.json`, and client components (`components/knowledge/KnowledgeDrawer.tsx`, `hooks/useChat.ts` → `lib/ai/mock-provider.ts`) import `knowledgeEngine` directly, bundling the entire company dataset into client JS chunks.
   - **Remediation:** Move all raw and canonical knowledge files out of `public/` into server-only storage (`data/`), expose only sanitized summary metadata to public marketing pages, and route chat + Knowledge Explorer queries through protected server API endpoints (`/api/chat`, `/api/knowledge`).

2. **Coarse Knowledge Chunking & Lossy Row-Level Traceability (`lib/knowledge/parser.ts`)**
   - **Evidence:** `parseKnowledgeData` merges `448` Excel rows into `44` coarse topic blobs (up to `3,816` characters in `botox-3`, `3,402` characters in `fillers-0`, `3,012` characters in `skin-boosters-12`). Individual products (`Juvederm Volux`, `Profhilo`, `Sculptra`), individual pregnancy rules (`Botox`, `Laser`, `Hydrafacial`), and individual veneer tiers (`2D`–`Diamond`) cannot be retrieved or cited individually, and `source.rowRange` spans entire multi-page sections instead of exact source rows.
   - **Evidence:** Cross-topic rows are mis-assigned: `Dental` row `26` (`"يوجد لدينا جميع أنواع الخدمات العلاجية للأسنان ما عدا التقويم والزراعة"`) is appended inside `Snap-On Smile`; `Facial ` row `23` (recommended intervals for Dermapen, Facial, and Peeling) is merged inside `التقشير-Peeling`; `Tattoo Removal` row `2` (`"we do the soft light & carbon laser with the same machine"`) is collapsed without a dedicated device/capability record.
   - **Remediation:** Build a complete multi-stage pipeline (`Knowlege.xlsx` → canonical JSON → normalized granular entity records + section overviews + typed attributes + exact `row` provenance + unmapped/conflict audit report).

3. **Inconsistent & Fragmented Knowledge Sources (`public/data/`)**
   - **Evidence:** Four separate data files exist in `public/data/`:
     - `Knowlege.xlsx` vs. `knowledge.json`: `3` real content differences (`Restylane kysse` `0xf0b7` bullets, `Skin Booster ` row `42` `تدريجية` vs `تدريجيًا`, and `Facial Machines  ` row `6` `المضاعفات` vs typo `المضفات`).
     - `clinics.json` (`["Dermadent", "One Touch", "Well Touch", "New Age"]`) is completely unused by `lib/knowledge/` and `components/landing/CompanyIntro.tsx`.
     - `CompanyIntro.tsx` hardcodes `VERIFIED_CLINICS` (`Demadent + VIP` spelling), while `ProductsSection.tsx` hardcodes `VERIFIED_HIGHLIGHTS`, duplicating knowledge out of the canonical dataset.
   - **Evidence:** Source Excel rows contain internal contradictions that are silently served as-is:
     - `Filler+Botox+Threads` row `98` (under Botox) copies filler post-care (`"النتائج تدوم بين 3 شهور إلى 1 سنة، حسب نوع الفلر"`), conflicting with Botox duration (`3–6 أشهر`).
     - `Radiesse` row `51` (`12–18 شهر`) conflicts with row `61` (`3 شهور إلى 1 سنة`).
     - `Tattoo Removal` uses `"Demadent"` while row `20` uses `"ديرمادنت"` (`Dermadent`) and `Slimming` uses `"WellTouch"` vs `"Well Touch"`.
   - **Remediation:** Consolidate `Knowlege.xlsx` + `clinics.json` into a single validated canonical dataset with explicit conflict flags and a documented source-of-truth policy.

4. **Server AI Endpoint Incomplete & Missing API Protections (`app/api/chat/route.ts`)**
   - **Evidence:** `app/api/chat/route.ts` always returns HTTP `501`, even when an API key exists (`.env` currently defines `API_KEY`), and `hooks/useChat.ts` calls client-side `mockProvider` instead of `/api/chat`.
   - **Evidence:** No rate limiting, no message/history size caps, no input sanitization, no timeout/`AbortController` handling, and no OpenAI or Google Gemini adapters exist.
   - **Remediation:** Implement server-side OpenAI and Google Gemini adapters, streaming/structured response contract validation, request limits, rate limiting, timeouts, and fallback handling.

---

### High Severity

5. **Retrieval Engine Lacks Modular Pipeline, Confidence Tiers & Abstention Calibration**
   - **Evidence:** `lib/knowledge/index.ts` performs full linear scans re-normalizing text at query time (`normalizeText` called on every record per search) with no pre-built normalized index.
   - **Evidence:** `lib/ai/mock-provider.ts` uses monolithic regex branches (`handleDevicesIntent`, `handlePricingIntent`, `handleClinicIntent`, `handleComparisonIntent`) with no confidence tiers (`strong`, `partial`, `ambiguous`, `none`), no ambiguity clarification across multiple matching products, and no automatic cross-entity joining (e.g., product → clinic availability → pregnancy safety restriction).

6. **Empty Category (`face-treatments`) & Unstructured Text Metadata**
   - **Evidence:** `lib/knowledge/categories.ts` defines `face-treatments` (`0` records), and `ProductsSection.tsx` filters out empty categories while keeping dead metadata (`VERIFIED_HIGHLIGHTS["face-treatments"]`).
   - **Evidence:** Prices, availability flags (`"غير متوفر ولكن ان تم السؤال عنه يتم توفيره"`), age limits (`18 عام` for Veneer, `12+` for Wegovy, `<13` forbidden / `<18` guardian for Laser), and clinic mappings are buried in unstructured strings rather than typed attributes.

7. **No Automated Test Suite or Knowledge Evaluation Framework**
   - **Evidence:** `package.json` has no `test` or `eval` scripts. There is no automated evaluation dataset (`>= 50` queries), no Recall@K / Precision@K / Top-1 metrics, no hallucination-prevention regression suite, and no security tests verifying bundle/public-route isolation.

8. **No Structured AI Response Contract**
   - **Evidence:** `AIResponse` returns raw Markdown only (`content: string`), forcing any metadata extraction to depend on string inspection rather than typed `answer`, `language`, `intent`, `sources`, `confidenceLevel`, `requiresClarification`, `clarificationQuestion`, `warnings`, and `externalSources`.

---

### Medium Severity

9. **Knowledge Explorer & Source Provenance UX Gaps**
   - `MessageBubble.tsx` only displays category + title chips; employees cannot click/inspect the exact source sheet, source row(s), match reasons, or confidence/warnings.
   - `KnowledgeDrawer.tsx` does not support clinic browsing, detailed record view, or related-record exploration (e.g., viewing pregnancy safety or clinic machines alongside a service).
   - Chat workspace lacks a "Stop generation" (`AbortController`) control and streaming UI state.

10. **External Search Provider Is Only a Type Stub (`lib/search/types.ts`)**
    - No optional server-side Google Custom Search integration exists with timeout, normalization, and explicit external attribution.

11. **Demo Auth & Privacy Boundaries Need Hardening**
    - `localAuthAdapter` (`lib/auth/local-adapter.ts`) hashes with SHA-256 in `localStorage`; documentation and UI must clearly label it as demo-only and avoid storing unnecessary PII or forwarding PII to external LLM APIs.

---

### Low Severity

12. **Minor Performance & Code Quality Improvements**
    - Precompute normalized text, token sets, and clinic/category inverted lookups once at load time rather than on every search.
    - Replace raw regex string matching in `mock-provider.ts` with a dedicated `lib/knowledge/intent.ts` classifier shared across retrieval, LLM context construction, and fallback responses.
    - Remove dead `externalDraft` references or unused category entries (`face-treatments` properly merged or populated).

---

## 3. Remediation Plan (Immediate Execution)

1. **P0 — Data Integrity & Security:** Move data files from `public/data/` to private server directory `data/`, build a deterministic Excel-to-Canonical pipeline (`scripts/build-knowledge.mjs` + `lib/knowledge/pipeline.ts` + runtime schema validator), generate `reports/knowledge-audit.json` & `reports/knowledge-audit.md`, and remove all client-bundle access to raw knowledge files.
2. **P1 — Advanced Bilingual Retrieval Engine:** Modular pipeline (`normalize` → `detectLanguage` → `classifyIntent` → `expandSynonyms` → `retrieve` → `scoreAndRank` → `assessConfidence` → `attachRelated` → `explain`).
3. **P2 — Real LLM + Google Search + Secure `/api/chat`:** Server-side OpenAI & Gemini adapters, optional Google Search adapter, streaming/structured JSON contract, rate limiting, validation, and timeouts.
4. **P3 — Evaluation & Automated Test Suite:** `evaluation/` (`50+` grounded QA cases, Recall@K, Precision@K, Top-1, hallucination tests, `reports/knowledge-evaluation.md`) + `tests/` (`knowledge`, `ai`, `security`, `app` integration tests).
5. **P4/P5 — Chat UX, Performance & Docs:** Source provenance inspector, clinic/product browsing & related records in Knowledge Explorer, Stop generation + streaming, pre-indexed retrieval, and updated docs (`KNOWLEDGE_SCHEMA.md`, `KNOWLEDGE_PIPELINE.md`, `AI_INTEGRATION.md`, `SECURITY.md`, `EVALUATION.md`, `PROJECT_CONTEXT.md`, `README.md`).

