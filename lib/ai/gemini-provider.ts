/**
 * Server-side Google Gemini provider.
 * Uses server-only credentials (`GOOGLE_AI_API_KEY`, `GEMINI_API_KEY`, or `API_KEY`).
 */

import { redactCustomerPII } from "@/lib/security/privacy";
import { toSafeErrorMessage } from "@/lib/security/api-guard";
import {
  buildContextPackage,
  buildSystemPromptWithContext,
  formatConversationHistory,
} from "./prompt-builder";
import { validateAndNormalizeStructuredOutput } from "./response-validator";
import type {
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ProviderValidationResult,
} from "./types";

const GEMINI_TIMEOUT_MS = 22_000;

function resolveGeminiKey(): string | null {
  if (typeof window !== "undefined") return null;
  const direct =
    process.env.GOOGLE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();
  if (direct) return direct;
  const generic = process.env.API_KEY?.trim();
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (generic && (explicit === "gemini" || generic.startsWith("AIza"))) {
    return generic;
  }
  return null;
}

const config: AIProviderConfig = {
  id: "gemini",
  name: "Google Gemini (Grounded RAG)",
  isMock: false,
  model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  maxContextChars: 7500,
};

export const geminiProvider: AIProvider = {
  config,

  validateConfiguration(): ProviderValidationResult {
    const key = resolveGeminiKey();
    if (!key) {
      return {
        configured: false,
        providerId: "gemini",
        reason: "GOOGLE_AI_API_KEY / GEMINI_API_KEY is not configured on the server.",
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
      throw new Error("Google Gemini provider is not configured on the server.");
    }

    const model = process.env.GEMINI_MODEL?.trim() || config.model!;
    const pkg = buildContextPackage(request.retrieval, {
      maxChars: config.maxContextChars,
      externalResults: request.externalResults,
      externalSearchNote: request.externalSearchNote,
    });

    const systemInstructionText = buildSystemPromptWithContext(pkg.contextPackage);
    const safeHistory = formatConversationHistory(request.conversationHistory).map(
      (m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: redactCustomerPII(m.content).sanitized }],
      })
    );
    const safeUserMessage = redactCustomerPII(request.userMessage).sanitized;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents: [
            ...safeHistory,
            { role: "user", parts: [{ text: safeUserMessage }] },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Google Gemini upstream error (HTTP ${res.status}).`);
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

      const structured = validateAndNormalizeStructuredOutput(rawText, {
        language: request.retrieval.classified.language,
        intent: request.retrieval.classified.intent,
        confidenceLevel: request.retrieval.confidence,
        requiresClarification: request.retrieval.requiresClarification,
        clarificationQuestion:
          request.retrieval.clarificationCandidates.length > 0
            ? "Please clarify which product or service you mean."
            : undefined,
        warnings: pkg.warnings,
      });

      return {
        ...structured,
        warnings: Array.from(new Set([...pkg.warnings, ...structured.warnings])),
        content: structured.answer,
        sources: pkg.sources,
        externalSources: pkg.externalSources,
        provider: `${config.name} · ${model}`,
        isMock: false,
      };
    } catch (err) {
      throw new Error(this.normalizeError(err));
    } finally {
      clearTimeout(timer);
      request.signal?.removeEventListener("abort", onAbort);
    }
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
      if (i % 6 === 0 || i === chunks.length - 1) {
        yield { type: "delta", text: buf };
        buf = "";
      }
    }
    yield { type: "complete", response: full };
  },
};

