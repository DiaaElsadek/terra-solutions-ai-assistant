# AI Provider & External Search Architecture

## Provider Abstraction (`lib/ai/`)

The chat workspace depends solely on the `AIProvider` interface (`lib/ai/types.ts`) via `getAIProvider()` (`lib/ai/provider.ts`):

- `AIRequest`: `{ userMessage, conversationHistory, knowledgeContext?, systemPrompt }`
- `AIResponse`: `{ content, sources, provider, isMock }`

### Current Mode: `mockProvider` (`lib/ai/mock-provider.ts`)
- Clearly labeled in the workspace header as **Knowledge Search Mode**.
- Executes real local retrieval via `knowledgeEngine.search()` and specialized intent handlers (devices, verified pricing/offers, clinic lookup, comparisons, call-center scripts).
- Formats output into scannable Markdown tables, callouts, and source attributions.
- Never fabricates prices, offers, clinic addresses, or medical suitability claims.

---

## System Prompt & Clinical Guardrails (`constants/prompts.ts`)

`buildSystemPrompt()` (`lib/ai/prompt-builder.ts`) injects retrieved knowledge records alongside strict instructions:
1. Treat the Excel knowledge base as the single source of truth for Terra Solutions.
2. Never invent prices, offers, clinic contact details, or specifications.
3. Explicitly state when requested information is absent from the knowledge base.
4. Always direct patient-specific medical suitability, contraindications, and diagnoses to a qualified clinic specialist.
5. Distinguish internal company records from any future external search results.

---

## Connecting a Real LLM Provider

1. Set a server-side secret key in `.env.local` (never `NEXT_PUBLIC_*`):
   ```env
   OPENAI_API_KEY=sk-...
   # or
   GOOGLE_AI_API_KEY=...
   ```
2. Complete `app/api/chat/route.ts` to call your preferred LLM SDK using the server-computed `systemPrompt` and conversation `history`.
3. Add an `apiProvider` in `lib/ai/` that `POST`s to `/api/chat` and switch `getAIProvider()` to return it.

---

## External Search Readiness (`lib/search/types.ts`)

`SearchProvider` defines an optional secondary search interface (`ExternalSearchResult` with `isExternal: true` and source URL attribution). Currently wired to `stubSearchProvider` (`isAvailable() === false`) so the assistant never claims to have performed live Google searches when offline.

