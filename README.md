# Terra AI Assistant — Terra Solutions

Internal business knowledge management and grounded conversational AI assistant built for **Terra Solutions** Call Center Agents and Customer Support Representatives.

Transforms Terra Solutions' 10-sheet Excel knowledge workbook and clinic directory into a fast, bilingual (Arabic, Egyptian Arabic & English) AI retrieval platform with row-level provenance, conflict warnings, strict abstention rules, and server-side security isolation.

---

## Tech Stack

- **Framework:** Next.js 16.4.6 (App Router, Cache Components & Partial Prefetching)
- **UI & Styling:** React 19.3.0, Tailwind CSS 4.3.3 (`@tailwindcss/turbopack`), `lucide-react`
- **Markdown Rendering:** `react-markdown` + `remark-gfm`
- **Language:** TypeScript 5 (strict mode)
- **Visual Identity:** Terra Solutions dark/gold theme (`#0D0B07`, `#161209`, `#CBB36A`, `Inter`, `Space Grotesk`)

---

## Routes & Endpoints

| Route | Experience | Access / Notes |
| --- | --- | --- |
| `/` | Marketing Landing Page | Public (`lib/knowledge/public-summary.ts` only — no raw data) |
| `/signin`, `/signup` | Demo Agent Authentication | Public (browser demo adapter) |
| `/chat` | AI Knowledge Workspace | Protected (`AuthGuard`, streaming NDJSON + Source Modal + Explorer) |
| `/api/chat` | Grounded AI Chat API (`GET`, `POST`) | Server-side rate-limited OpenAI/Gemini/Mock RAG + PII redaction |
| `/api/knowledge` | Knowledge Explorer API (`GET`) | Server-side filtered canonical records, clinics & related links |

---

## Scripts

```bash
npm install
npm run dev              # Development server
npm run build            # Production Next.js build
npm run start            # Start production server
npm run lint             # Run ESLint
npm run knowledge:build  # Rebuild canonical dataset + audit reports from data/raw/Knowlege.xlsx
npm run eval             # Run 56-case retrieval & abstention benchmark (reports/knowledge-evaluation.md)
npm test                 # Run all 23 automated unit, security, route & storage tests
```

---

## Environment Variables (Server-Only Secrets)

Only `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_VERSION` are exposed to the browser. Configure secrets in `.env` or `.env.local` on the server only:

- `AI_PROVIDER` *(optional)* — `"openai"` or `"gemini"` (auto-detected when omitted)
- `OPENAI_API_KEY` / `OPENAI_MODEL` *(optional)* — Server OpenAI credentials (default `gpt-4o-mini`)
- `GOOGLE_AI_API_KEY` / `GEMINI_API_KEY` / `GEMINI_MODEL` *(optional)* — Server Gemini credentials (default `gemini-2.5-flash`)
- `API_KEY` *(optional)* — Fallback server LLM key (`sk-...` routes to OpenAI, `AIza...` to Gemini)
- `GOOGLE_SEARCH_API_KEY` & `GOOGLE_SEARCH_ENGINE_ID` *(optional)* — Server-side Google Custom Search

---

## Documentation Suite

- [ENGINEERING_AUDIT.md](./ENGINEERING_AUDIT.md) — Initial repository findings & remediation plan
- [KNOWLEDGE_PIPELINE.md](./KNOWLEDGE_PIPELINE.md) — Excel-to-canonical ETL pipeline & data integrity audit (`448/448` rows mapped, `0` unmapped)
- [KNOWLEDGE_SCHEMA.md](./KNOWLEDGE_SCHEMA.md) — Canonical schema (`148` records), validation & bilingual retrieval architecture
- [AI_INTEGRATION.md](./AI_INTEGRATION.md) — OpenAI/Gemini providers, structured output validator, streaming & Google Search
- [SECURITY.md](./SECURITY.md) — Data isolation, PII redaction, rate limiting, safe error sanitization & auth boundaries
- [EVALUATION.md](./EVALUATION.md) — `56`-question evaluation benchmark (`100.0%` pass, `93.9%` Top-1, `100.0%` Recall@3, `100.0%` Abstention)
- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — Architecture tree, `localStorage` schema & production migration notes

---

## Current Operational & Auth Boundaries

1. **Demo Authentication:** Agent accounts and sessions use `localAuthAdapter` (`localStorage` + SHA-256). Add server-side session middleware before deploying publicly.
2. **Browser-Local History:** Chat conversations remain local to each browser (`terra_v1_*`) rather than synced in a shared database.
3. **In-Memory Rate Limiter:** `/api/chat` and `/api/knowledge` use per-worker memory (`Map`); configure Redis/Upstash for multi-instance deployments.
4. **Live LLM Verification:** `npm test` verifies OpenAI/Gemini formatting with mocked HTTP responses; end-to-end live API testing requires valid quota/network access for the configured server API key.
