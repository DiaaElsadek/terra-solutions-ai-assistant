# Security, Data Isolation & Privacy Controls

## 1. Confidential Knowledge Isolation

- All Excel spreadsheets and raw/canonical JSON files (`Knowlege.xlsx`, `clinics.json`, `knowledge.canonical.json`) are stored strictly in server-only `data/raw/` and `data/canonical/`.
- Zero `.xlsx`, `.xls`, `.json`, or `.csv` knowledge files are stored in `public/`. Requesting `/data/Knowlege.xlsx` returns HTTP `404`.
- `lib/knowledge/server-store.ts` throws immediately if imported or invoked in a browser context (`typeof window !== "undefined"`).
- Client components communicate only with server route handlers:
  - `app/api/chat/route.ts` (grounded answers + sources)
  - `app/api/knowledge/route.ts` (filtered records, clinics, and related entries for the Knowledge Explorer)
- Public marketing pages (`/`) read only sanitized category counts and clinic names via `lib/knowledge/public-summary.ts` rendered in Server Components (`components/landing/ProductsSection.tsx`, `components/landing/CompanyIntro.tsx`).

---

## 2. Secret & Environment Variable Protection

- API keys (`API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_ENGINE_ID`) remain strictly server-side without `NEXT_PUBLIC_` prefixes.
- `toSafeErrorMessage()` (`lib/security/api-guard.ts`) scrubs `sk-...`, `AIza...`, and `Bearer ...` tokens and caps error message length before returning errors in HTTP JSON or NDJSON streams.

---

## 3. Outbound Privacy / PII Redaction (`lib/security/privacy.ts`)

Before forwarding agent queries or conversation history to OpenAI, Google Gemini, or Google Custom Search, `redactCustomerPII()` masks:
- Email addresses → `[EMAIL_REDACTED]`
- 14-digit national IDs → `[ID_REDACTED]`
- Customer phone numbers (8–15 digits) → `[PHONE_REDACTED]` (preserving product measurements and currency prices such as `5000 AED` or `100 unit`).

---

## 4. API Abuse Protection (`lib/security/api-guard.ts`)

`POST /api/chat` and `GET /api/knowledge` enforce:
- Sliding-window per-client IP rate limiting (`30` requests/min default on `/api/chat`, `60` requests/min on `/api/knowledge`, returning HTTP `429` with `Retry-After`). *Note: currently in-memory per Node worker; replace with Redis/Upstash for multi-instance deployments.*
- `32 KB` maximum request body size (`413` on overflow), `2000`-character message cap (`400`), ASCII control-character stripping (`sanitizeUserText`), and history cap (`16` recent turns).

---

## 5. Authentication Boundary & Production Migration Note

- The current `localAuthAdapter` (`lib/auth/local-adapter.ts`) and browser `AuthGuard` (`components/auth/AuthGuard.tsx`) are **demo-only** (SHA-256 hashed credentials stored in browser `localStorage`, no server session cookies).
- Before exposing `/api/chat` and `/api/knowledge` on an untrusted or public network, place real server-side authentication and session verification (`NextAuth` / `Auth.js` / `Clerk` / corporate SSO middleware) in front of `/chat`, `/api/chat`, and `/api/knowledge`.

