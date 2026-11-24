/**
 * Server-side AI provider selector & orchestration helper.
 * Automatically picks OpenAI or Google Gemini when configured on the server,
 * and otherwise provides the explicit deterministic Knowledge Search Mode fallback.
 */

import { openaiProvider } from "./openai-provider";
import { geminiProvider } from "./gemini-provider";
import { mockProvider } from "./mock-provider";
import type { AIProvider } from "./types";

export type PreferredProvider = "auto" | "openai" | "gemini" | "mock";

/**
 * Resolve which server provider handles chat generation.
 * Never exposes API keys to client components.
 */
export function resolveServerAIProvider(
  preferred: PreferredProvider = "auto"
): { provider: AIProvider; fallbackUsed: boolean; reason?: string } {
  if (preferred === "mock") {
    return { provider: mockProvider, fallbackUsed: false };
  }

  const explicitEnv = process.env.AI_PROVIDER?.trim().toLowerCase();
  const openaiReady = openaiProvider.validateConfiguration().configured;
  const geminiReady = geminiProvider.validateConfiguration().configured;

  if (preferred === "openai") {
    if (openaiReady) return { provider: openaiProvider, fallbackUsed: false };
    return {
      provider: mockProvider,
      fallbackUsed: true,
      reason: "Requested OpenAI provider is not configured on the server.",
    };
  }

  if (preferred === "gemini") {
    if (geminiReady) return { provider: geminiProvider, fallbackUsed: false };
    return {
      provider: mockProvider,
      fallbackUsed: true,
      reason: "Requested Gemini provider is not configured on the server.",
    };
  }

  // Auto mode: honor AI_PROVIDER if set, otherwise pick whichever provider is configured
  if (explicitEnv === "gemini" && geminiReady) {
    return { provider: geminiProvider, fallbackUsed: false };
  }
  if (explicitEnv === "openai" && openaiReady) {
    return { provider: openaiProvider, fallbackUsed: false };
  }
  if (geminiReady) return { provider: geminiProvider, fallbackUsed: false };
  if (openaiReady) return { provider: openaiProvider, fallbackUsed: false };

  return {
    provider: mockProvider,
    fallbackUsed: true,
    reason:
      "No upstream LLM API key (OPENAI_API_KEY, GOOGLE_AI_API_KEY, or GEMINI_API_KEY) is configured on the server.",
  };
}

/** Backward-compatible accessor for deterministic/test use. */
export function getAIProvider(type: PreferredProvider = "auto"): AIProvider {
  return resolveServerAIProvider(type).provider;
}

export { openaiProvider, geminiProvider, mockProvider };
export type {
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  StructuredAIOutput,
} from "./types";
