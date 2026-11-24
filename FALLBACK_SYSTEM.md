# Intelligent Local Fallback & Resilience Architecture

## Purpose ([lib/ai/providers/local-fallback-provider.ts](file:///F:/Terra%20Solutions/terra-solutions-chatbot/lib/ai/providers/local-fallback-provider.ts))

Ensures Call Center and Support agents continue receiving verified, properly formatted, bilingual company knowledge whenever Gemini is unavailable or unreliable.

---

## Automatic Activation Triggers (`app/api/chat/route.ts`)

`generateWithFallback()` automatically switches to `localFallbackProvider` whenever:
1. No Gemini/OpenAI key is configured (`MISSING_API_KEY`).
2. Gemini hits upstream quota or rate limits (`GEMINI_RATE_LIMIT`, after at most 1 backoff retry).
3. Gemini exceeds its `22s` timeout (`GEMINI_TIMEOUT`, unless the user clicked **Stop**).
4. Gemini returns an HTTP error or network error (`GEMINI_UNAVAILABLE`).
5. Gemini returns unparseable/invalid JSON after 1 corrective retry (`INVALID_MODEL_RESPONSE`).

---

## Behavior & Guarantees

- **Identical Schema:** Emits the full `RichAIResponse` contract (`meta.provider: "local_fallback"`) with tables, verified AED metric cards, conflict disclosures, safety escalation callouts, and `source_list` citations so `AIResponseRenderer` renders seamlessly.
- **Explicit Attribution:** Response headers (`ChatHeader.tsx`) and message metadata/warnings clearly label responses as coming from `Terra Local Knowledge Engine` (`local_fallback`) rather than impersonating Gemini.
- **Zero Fabrication & Conflict Preservation:**
  - Absent prices, nonexistent clinics (`Cairo Star Clinic`), nonexistent devices (`Emsculpt Neo Max Pro`), or diagnostic prompts emit the standardized Arabic/English unavailable messages with `status: "not_found"` and `grounded: false`.
  - Conflicting rows (Botox R156 vs R132/R147, Radiesse R96 vs R106) trigger `danger`/`warning` conflict callouts displaying source locations instead of guessing.

