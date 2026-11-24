/**
 * Server-side OpenAI Chat Completions provider.
 * Supports structured JSON (`RichAIResponse`) with source verification & PII redaction.
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
} from "./response-schema";
import { validateAndNormalizeStructuredOutput } from "./response-validator";
import type {
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ProviderValidationResult,
} from "./types";

const OPENAI_TIMEOUT_MS = 22_000;

function resolveOpenAIKey(): string | null {
  if (typeof window !== "undefined") return null;
  const direct = process.env.OPENAI_API_KEY?.trim();
  if (direct) return direct;
  const generic = process.env.API_KEY?.trim();
  const explicit = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (generic && (explicit === "openai" || generic.startsWith("sk-"))) {
    return generic;
  }
  return null;
}

const config: AIProviderConfig = {
  id: "openai",
  name: "OpenAI (Grounded RAG)",
  isMock: false,
  model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  maxContextChars: 7500,
};

export const openaiProvider: AIProvider = {
  config,

  validateConfiguration(): ProviderValidationResult {
    const key = resolveOpenAIKey();
    if (!key) {
      return {
        configured: false,
        providerId: "openai",
        reason: "OPENAI_API_KEY is not configured on the server.",
      };
    }
    return { configured: true, providerId: "openai" };
  },

  normalizeError(err: unknown): string {
    return toSafeErrorMessage(err);
  },

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const apiKey = resolveOpenAIKey();
    if (!apiKey) {
      throw new Error("OpenAI provider is not configured on the server.");
    }

    const model = process.env.OPENAI_MODEL?.trim() || config.model!;
    const pkg = buildContextPackage(request.retrieval, {
      maxChars: config.maxContextChars,
      externalResults: request.externalResults,
      externalSearchNote: request.externalSearchNote,
    });

    const systemContent = buildSystemPromptWithContext(pkg.contextPackage);
    const safeHistory = formatConversationHistory(request.conversationHistory).map(
      (m) => ({
        role: m.role,
        content: redactCustomerPII(m.content).sanitized,
      })
    );
    const safeUserMessage = redactCustomerPII(request.userMessage).sanitized;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    request.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemContent },
            ...safeHistory,
            { role: "user", content: safeUserMessage },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenAI upstream error (HTTP ${res.status}).`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawText = data.choices?.[0]?.message?.content || "";

      const richCheck = validateModelRichResponse(rawText, {
        retrievedRecords: pkg.retrievedRecords,
        confidence: request.retrieval.confidence,
        fallbackLanguage: request.retrieval.classified.language,
        provider: "openai",
        model,
      });

      if (richCheck.ok && richCheck.response) {
        const rich = richCheck.response;
        const markdown = richResponseToMarkdown(rich);
        return {
          answer: markdown,
          content: markdown,
          language: rich.language,
          intent: request.retrieval.classified.intent,
          confidenceLevel: mapConfidenceFromStatus(rich.status),
          requiresClarification: rich.status === "clarification",
          warnings: pkg.warnings,
          structured: rich,
          sources: mergeVerifiedMessageSources(
            pkg.sources,
            rich.sources,
            pkg.retrievedRecords
          ),
          externalSources: pkg.externalSources,
          provider: `${config.name} · ${model}`,
          isMock: false,
        };
      }

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
    const words = full.answer.split(/(\s+)/);
    let buffer = "";
    for (let i = 0; i < words.length; i++) {
      if (request.signal?.aborted) break;
      buffer += words[i];
      if (i % 6 === 0 || i === words.length - 1) {
        yield { type: "delta", text: buffer };
        buffer = "";
      }
    }
    yield { type: "complete", response: full };
  },
};
