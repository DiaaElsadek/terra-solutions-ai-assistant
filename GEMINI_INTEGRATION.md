# Gemini API Integration Guide

## Overview

Terra AI Assistant uses a **Retrieval-Augmented Generation (RAG)** architecture where Gemini functions strictly as a language understanding and structured-presentation layer on top of Terra Solutions' verified knowledge base — never as the authoritative factual source.

```text
Employee Question
  -> Conversation Follow-Up Context Resolution (`lib/knowledge/context-query.ts`)
  -> Knowledge Retrieval (`lib/knowledge/retriever.ts`)
  -> Relevant Records + Exact Row Provenance (`lib/ai/prompt-builder.ts`)
  -> Gemini `v1beta/models/{model}:generateContent` (`lib/ai/gemini-provider.ts`)
  -> Server JSON Schema & Citation Verification (`lib/ai/response-schema.ts`)
  -> Automatic Local Fallback (`lib/ai/providers/local-fallback-provider.ts`) on any error
  -> Safe Semantic React Renderer (`components/chat/AIResponseRenderer.tsx`)
```

---

## Configuration & SDK Decision

- **Transport:** Uses standard Node.js `fetch` directly against the official Google Generative Language REST endpoint (`https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`) with `responseMimeType: "application/json"` and zero unnecessary third-party SDK dependencies.
- **Default Model:** `gemini-2.5-flash` (overridable via `GEMINI_MODEL`).
- **Environment Variable Resolution (`resolveGeminiKey()`):**
  1. `GOOGLE_AI_API_KEY`
  2. `GEMINI_API_KEY`
  3. `API_KEY` (already defined in `.env`; automatically used by Gemini unless `AI_PROVIDER=openai` or key starts with `sk-`).
- **Security:** Keys stay strictly server-side inside `app/api/chat/route.ts` and `lib/ai/gemini-provider.ts`, are redacted from errors by `toSafeErrorMessage()`, and customer PII is scrubbed via `redactCustomerPII()` before calling Gemini.

---

## System Prompt & Grounding Rules ([lib/ai/prompts/terra-system-prompt.ts](file:///F:/Terra%20Solutions/terra-solutions-chatbot/lib/ai/prompts/terra-system-prompt.ts))

- `TERRA_PROMPT_VERSION = "2.1.0"` instructs Gemini to:
  - Rely solely on the retrieved Terra Solutions context for prices, clinics, devices, offers, and policies.
  - Preserve numbers, prices, currencies (`AED`), units (`ml`, `unit`, `threads`), age restrictions, and wait periods verbatim.
  - Emit exact Arabic or English unavailable-information notices when records are absent.
  - Surface conflicting records transparently rather than picking one arbitrarily.
  - Escalate clinical diagnosis, pregnancy/lactation, and contraindication decisions to clinic doctors.
  - Return strict `RichAIResponse` JSON without raw HTML (`<red>`, `<script>`), CSS, or fake citations.

---

## Reliability Controls

- **Timeout:** `22s` request timeout wired to `AbortController`.
- **Transient Retry:** At most 1 exponential-backoff retry (`650ms`) on `HTTP 429` (`GEMINI_RATE_LIMIT`) or upstream `GEMINI_UNAVAILABLE`.
- **Corrective Retry:** At most 1 corrective retry when output fails `validateModelRichResponse()` (`INVALID_MODEL_RESPONSE`).
- **Error Codes:** `MISSING_API_KEY`, `GEMINI_TIMEOUT`, `GEMINI_RATE_LIMIT`, `GEMINI_UNAVAILABLE`, `INVALID_MODEL_RESPONSE`, `KNOWLEDGE_RETRIEVAL_ERROR`, `INVALID_REQUEST`.
- **Automatic Fallback:** Any non-aborted Gemini failure triggers `localFallbackProvider` seamlessly so employees continue getting grounded company answers during calls.

