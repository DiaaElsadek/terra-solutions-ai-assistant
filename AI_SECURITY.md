# Terra Solutions AI Security, Privacy & Grounding Controls

This document details all security, data isolation, privacy, and anti-hallucination safeguards implemented across Terra Solutions Assistant.

---

## 1. Confidential Knowledge Data Isolation

- **Zero Public Dataset Exposure:** Raw spreadsheets (`data/raw/Knowlege.xlsx`, `data/raw/clinics.json`) and canonical stores (`data/canonical/knowledge.canonical.json`, `data/canonical/sheet-rows.json`) reside exclusively outside `public/`. Direct static HTTP access returns `404`.
- **Server-Only Store Guard (`lib/knowledge/server-store.ts`):** Throws immediately if executed inside a browser runtime (`typeof window !== "undefined"`). Client UI components never import canonical datasets directly.
- **Public Marketing Isolation (`lib/knowledge/public-summary.ts`):** Public landing components render only coarse sanitized counts and clinic names.

---

## 2. API Key & Upstream Provider Privacy

- **Server-Side Environment Secrets:** `GOOGLE_AI_API_KEY`, `GEMINI_API_KEY`, `API_KEY`, `OPENAI_API_KEY`, `GOOGLE_SEARCH_API_KEY`, and `GOOGLE_SEARCH_ENGINE_ID` have no `NEXT_PUBLIC_` prefix and are never serialized into Next.js client bundles or browser responses.
- **Error Token Redaction (`toSafeErrorMessage` in `lib/security/api-guard.ts`):** Strips `sk-...`, `AIza...`, and `Bearer ...` substrings and truncates error text to `220` characters before logging or returning JSON errors.
- **UI Brand Isolation:** All user-facing UI surfaces and error states present exclusively **Terra Solutions Assistant** without exposing upstream AI provider names (`Gemini`, `Google`, `OpenAI`) or internal model strings.

---

## 3. Outbound Customer PII Redaction (`lib/security/privacy.ts`)

Before outbound calls leave the server (`gemini-provider.ts`, `openai-provider.ts`, external web search):
- Emails are masked to `[EMAIL_REDACTED]`.
- 14-digit national IDs are masked to `[ID_REDACTED]`.
- 8–15 digit phone numbers are masked to `[PHONE_REDACTED]` while preserving clinical unit quantities and prices (e.g., `100 unit`, `5000 AED`).

---

## 4. API Input Validation & Rate Limiting (`lib/security/api-guard.ts`)

- **Request Size & Length Caps (`API_LIMITS`):** Maximum HTTP payload `32 KB` (`413`), maximum single message `2,000` characters (`400`), maximum `16` recent history turns (`4,000` characters per historical turn), plus control-character stripping via `sanitizeUserText`.
- **Sliding-Window Rate Limiting (`checkRateLimit`):** `30` requests/minute per client IP on `POST /api/chat` and `60` requests/minute on `GET /api/knowledge` (`429` with `Retry-After`). Multi-instance production deployments should swap this in-memory `Map` interface for Redis/Upstash.

---

## 5. Grounding, Anti-Hallucination & Prompt-Injection Defense

- **Canonical Context Boundary (`lib/ai/prompt-builder.ts`):** All retrieved company facts enter inside structured `[SourceId | File | Sheet | Rows | Cells]` blocks capped at `7,500` characters. Conversation history is never treated as a company fact source (`context-query.ts` + `terra-system-prompt.ts` v3.0.0).
- **Server-Side Output Verification (`validateModelRichResponse` & `mergeVerifiedMessageSources`):** Every AI-generated response is schema-checked; any cited source not present in the request's verified canonical sources is stripped, arbitrary HTML tags are sanitized before Markdown/block rendering (`SafeInlineText` + `AIResponseRenderer`), and malformed model JSON triggers one corrective retry before automatic `localFallbackProvider` failover.
- **Abstention & Unsupported Compound Guards:** Queries asking for undocumented combinations (`بوتوكس الشعر`), missing offers/prices (`MISSING_PRICE_MESSAGES`), unknown clinic names (`unknownClinicRequested`), unrelated domains, or clinical prescriptions/diagnoses (`medical_diagnosis`) are intercepted deterministically without fabrication.

---

## 6. Authentication Boundary Note

`localAuthAdapter` (`lib/auth/local-adapter.ts`) is an internal demo adapter storing SHA-256 credentials in browser `localStorage`. Production deployment on an untrusted or public network requires placing real server-side SSO/session middleware in front of `/chat`, `/api/chat`, and `/api/knowledge`.

