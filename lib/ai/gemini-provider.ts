/**
 * Server-side Google Gemini Provider.
 *
 * Integration & Reliability:
 * - Reads server-only key from `GOOGLE_AI_API_KEY`, `GEMINI_API_KEY`, or `.env`'s `API_KEY`
 *   (unless `AI_PROVIDER=openai` or key clearly starts with `sk-`).
 * - Sends bounded retrieved company context (never the full workbook).
 * - Enforces JSON output matching `RichAIResponse` with strict server validation.
 * - Retries at most once on invalid JSON schema with corrective instructions, and
 *   at most once with backoff on transient rate limit (429) / 503.
 * - Categorizes all failures (`MISSING_API_KEY`, `GEMINI_TIMEOUT`, `GEMINI_RATE_LIMIT`,
 *   `GEMINI_UNAVAILABLE`, `INVALID_MODEL_RESPONSE`) cleanly without exposing secrets.
 */

import { redactCustomerPII } from "@/lib/security/privacy";
import { toSafeErrorMessage } from "@/lib/security/api-guard";
import {
  buildContextPackage,
  buildSystemPromptWithContext,
  formatConversationHistory,
} from "./prompt-builder";
import {
  mapConfidenceFromStatus,
  mergeVerifiedMessageSources,
  richResponseToMarkdown,
  validateModelRichResponse,
  type AIErrorCode,
} from "./response-schema";
import type {
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ProviderValidationResult,
} from "./types";

const GEMINI_TIMEOUT_MS = 22_000;
const RETRY_BACKOFF_MS = 650;

export class AIProviderError extends Error {
  readonly category: AIErrorCode;
  constructor(category: AIErrorCode, message: string) {
    super(message);
    this.name = "AIProviderError";
    this.category = category;
  }
}

export function resolveGeminiKey(): string | null {
  if (typeof window !== "undefined") return null;
  const direct =
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();
  if (direct) return direct;

  const generic = process.env.API_KEY?.trim();
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (generic && explicit !== "openai" && !generic.startsWith("sk-")) {
    return generic;
  }
  return null;
}

function getConfiguredGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

const config: AIProviderConfig = {
  id: "gemini",
  name: "Google Gemini (Grounded RAG)",
  isMock: false,
  model: getConfiguredGeminiModel(),
  maxContextChars: 7500,
};

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

async function callGeminiOnce(params: {
  endpoint: string;
  apiKey: string;
  systemInstruction: string;
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>;
  signal?: AbortSignal;
}): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), GEMINI_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort("client-abort");
  params.signal?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    const res = await fetch(params.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": params.apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.systemInstruction }],
        },
        contents: params.contents,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (res.status === 429) {
      throw new AIProviderError(
        "GEMINI_RATE_LIMIT",
        "Gemini rate limit exceeded (HTTP 429)."
      );
    }

    if (!res.ok) {
      throw new AIProviderError(
        "GEMINI_UNAVAILABLE",
        `Google Gemini upstream error (HTTP ${res.status}).`
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const rawText =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") || "";

    if (!rawText.trim()) {
      throw new AIProviderError(
        "INVALID_MODEL_RESPONSE",
        "Gemini returned an empty response payload."
      );
    }

    return rawText;
  } catch (err) {
    if (err instanceof AIProviderError) throw err;
    if (
      err instanceof Error &&
      (err.name === "AbortError" ||
        String(err.message).toLowerCase().includes("abort") ||
        controller.signal.aborted)
    ) {
      throw new AIProviderError(
        "GEMINI_TIMEOUT",
        "Gemini request timed out or was cancelled."
      );
    }
    throw new AIProviderError(
      "GEMINI_UNAVAILABLE",
      toSafeErrorMessage(err)
    );
  } finally {
    clearTimeout(timer);
    params.signal?.removeEventListener("abort", onExternalAbort);
  }
}

export const geminiProvider: AIProvider = {
  config,

  validateConfiguration(): ProviderValidationResult {
    const key = resolveGeminiKey();
    if (!key) {
      return {
        configured: false,
        providerId: "gemini",
        reason:
          "No Gemini API key found (checked GOOGLE_AI_API_KEY, GEMINI_API_KEY, and API_KEY).",
      };
    }
    return { configured: true, providerId: "gemini" };
  },

  normalizeError(err: unknown): string {
    return toSafeErrorMessage(err);
  },

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const apiKey = resolveGeminiKey();
    if (!apiKey) {
      throw new AIProviderError(
        "MISSING_API_KEY",
        "Gemini API key is not configured on the server."
      );
    }

    const model = getConfiguredGeminiModel();
    const pkg = buildContextPackage(request.retrieval, {
      maxChars: config.maxContextChars,
      externalResults: request.externalResults,
      externalSearchNote: request.externalSearchNote,
    });

    const systemInstruction = buildSystemPromptWithContext(pkg.contextPackage);
    const safeHistory: Array<{
      role: "user" | "model";
      parts: Array<{ text: string }>;
    }> = formatConversationHistory(request.conversationHistory).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: redactCustomerPII(m.content).sanitized }],
    }));

    const safeUserMessage = redactCustomerPII(request.userMessage).sanitized;
    const baseContents: Array<{
      role: "user" | "model";
      parts: Array<{ text: string }>;
    }> = [...safeHistory, { role: "user", parts: [{ text: safeUserMessage }] }];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    // Execute primary request with at most 1 transient backoff retry for 429 / 5xx
    let rawText = "";
    try {
      rawText = await callGeminiOnce({
        endpoint,
        apiKey,
        systemInstruction,
        contents: baseContents,
        signal: request.signal,
      });
    } catch (firstErr) {
      if (
        firstErr instanceof AIProviderError &&
        (firstErr.category === "GEMINI_RATE_LIMIT" ||
          firstErr.category === "GEMINI_UNAVAILABLE") &&
        !request.signal?.aborted
      ) {
        await sleepWithAbort(RETRY_BACKOFF_MS, request.signal);
        rawText = await callGeminiOnce({
          endpoint,
          apiKey,
          systemInstruction,
          contents: baseContents,
          signal: request.signal,
        });
      } else {
        throw firstErr;
      }
    }

    // Strict server-side schema + source verification
    let checked = validateModelRichResponse(rawText, {
      retrievedRecords: pkg.retrievedRecords,
      confidence: request.retrieval.confidence,
      fallbackLanguage: request.retrieval.classified.language,
      provider: "gemini",
      model,
    });

    // At most ONE corrective retry when schema validation fails
    if (!checked.ok && !request.signal?.aborted) {
      const correctiveContents: Array<{
        role: "user" | "model";
        parts: Array<{ text: string }>;
      }> = [
        ...baseContents,
        { role: "model", parts: [{ text: rawText.slice(0, 1500) }] },
        {
          role: "user",
          parts: [
            {
              text: `CORRECTION REQUIRED: Your previous output failed JSON validation (${checked.error}). Return ONLY a valid JSON object matching { schemaVersion: "1.0", language, status, answer: { summary, blocks }, sources, meta }.`,
            },
          ],
        },
      ];

      const retryText = await callGeminiOnce({
        endpoint,
        apiKey,
        systemInstruction,
        contents: correctiveContents,
        signal: request.signal,
      });

      checked = validateModelRichResponse(retryText, {
        retrievedRecords: pkg.retrievedRecords,
        confidence: request.retrieval.confidence,
        fallbackLanguage: request.retrieval.classified.language,
        provider: "gemini",
        model,
      });
    }

    if (!checked.ok || !checked.response) {
      throw new AIProviderError(
        "INVALID_MODEL_RESPONSE",
        checked.error || "Gemini response failed structured schema validation."
      );
    }

    const rich = checked.response;
    const verifiedMsgSources = mergeVerifiedMessageSources(
      pkg.sources,
      rich.sources,
      pkg.retrievedRecords
    );
    const markdownBody = richResponseToMarkdown(rich);

    return {
      answer: markdownBody,
      content: markdownBody,
      language: rich.language,
      intent: request.retrieval.classified.intent,
      confidenceLevel: mapConfidenceFromStatus(rich.status),
      requiresClarification: rich.status === "clarification",
      clarificationQuestion:
        rich.status === "clarification" ? rich.answer.summary : undefined,
      warnings: pkg.warnings,
      structured: rich,
      sources: verifiedMsgSources,
      externalSources: pkg.externalSources,
      provider: "Terra Assistant",
      isMock: false,
      fallbackUsed: false,
    };
  },

  async *streamResponse(
    request: AIRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const full = await this.generateResponse(request);
    const chunks = full.answer.split(/(\s+)/);
    let buf = "";
    for (let i = 0; i < chunks.length; i++) {
      if (request.signal?.aborted) break;
      buf += chunks[i];
      if (i % 8 === 0 || i === chunks.length - 1) {
        yield { type: "delta", text: buf };
        buf = "";
      }
    }
    yield { type: "complete", response: full };
  },
};
