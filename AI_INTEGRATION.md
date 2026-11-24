# AI Providers, Structured Output & External Search

## Overview (`lib/ai/` & `app/api/chat/route.ts`)

All AI generation runs strictly on the server via `/api/chat` (`POST` for answers/streaming, `GET` for provider readiness status). Client components (`hooks/useChat.ts`) never call upstream AI APIs directly and never hold API keys.

---

## Provider Resolution (`lib/ai/provider.ts`)

`resolveServerAIProvider(preferred)` selects an implementation of `AIProvider` (`lib/ai/types.ts`):

1. **Google Gemini** (`lib/ai/gemini-provider.ts`) — Active when `GOOGLE_AI_API_KEY`, `GEMINI_API_KEY`, or Gemini-formatted `API_KEY` (`AIza...`) is set on the server (default model `gemini-2.5-flash`, override via `GEMINI_MODEL`).
2. **OpenAI** (`lib/ai/openai-provider.ts`) — Active when `OPENAI_API_KEY` or OpenAI-formatted `API_KEY` (`sk-...`) is set on the server (default model `gpt-4o-mini`, override via `OPENAI_MODEL`).
3. **Deterministic Knowledge Search Mode** (`lib/ai/mock-provider.ts`) — Explicit `isMock: true` fallback used when no upstream LLM key is configured or when explicitly requested (`preferredProvider: "mock"`). It performs the full canonical retrieval pipeline and honest abstention without inventing an LLM label.

You can pin selection between OpenAI and Gemini with `AI_PROVIDER=openai` or `AI_PROVIDER=gemini`.

---

## Grounded Context & Structured Contract (`constants/prompts.ts`, `lib/ai/prompt-builder.ts`, `lib/ai/response-validator.ts`)

- `PROMPT_VERSION = "2.0.0"` enforces company-truth grounding, strict no-fabrication rules (prices, discounts, clinic addresses/hours), medical diagnosis/prescription abstention, conflict disclosure, ambiguity clarification, and bilingual Arabic/English response style without emojis.
- `buildContextPackage()` serializes up to a bounded character budget (`7,500` chars) including retrieved records, Excel file/sheet/row provenance, related records, conflict alerts, missing-data indicators, and optional secondary external links.
- `validateAndNormalizeStructuredOutput()` parses structured JSON (`answer`, `language`, `intent`, `confidenceLevel`, `requiresClarification`, `clarificationQuestion`, `warnings`) and safely wraps plain-Markdown upstream outputs without throwing.

---

## Streaming & Cancellation

When `stream: true` is sent to `POST /api/chat`, the route emits `application/x-ndjson` frames (`meta`, `delta`, `done`, `error`) and wires `request.signal` through to an `AbortController` with a `22s` upstream timeout. The Workspace UI renders progressive streaming text and exposes a **Stop generation** control (`hooks/useChat.ts`).

---

## Optional External Web Search (`lib/search/google-search.ts`)

- Configured strictly on the server via `GOOGLE_SEARCH_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID`.
- Returns `{ available: false, results: [] }` with an explicit note when unconfigured — never fabricates web results.
- Redacts customer PII (`redactCustomerPII`) before sending queries, enforces a `6s` timeout, and separates returned links under secondary external citations (`isExternal: true`).
