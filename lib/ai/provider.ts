/**
 * Server-side AI provider selector & orchestration helper.
 * Prioritizes Google Gemini when configured on the server, supports OpenAI,
 * and provides `localFallbackProvider` whenever upstream LLMs are unavailable.
 */

import { geminiProvider } from "./gemini-provider";
import { openaiProvider } from "./openai-provider";
import { localFallbackProvider } from "./providers/local-fallback-provider";
import type { AIProvider } from "./types";

export type PreferredProvider =
  | "auto"
  | "openai"
  | "gemini"
  | "mock"
  | "local_fallback";

export function resolveServerAIProvider(
  preferred: PreferredProvider = "auto"
): { provider: AIProvider; fallbackUsed: boolean; reason?: string } {
  if (preferred === "mock" || preferred === "local_fallback") {
    return { provider: localFallbackProvider, fallbackUsed: true };
  }

  const explicitEnv = process.env.AI_PROVIDER?.trim().toLowerCase();
  const geminiReady = geminiProvider.validateConfiguration().configured;
  const openaiReady = openaiProvider.validateConfiguration().configured;

  if (preferred === "gemini") {
    if (geminiReady) return { provider: geminiProvider, fallbackUsed: false };
    return {
      provider: localFallbackProvider,
      fallbackUsed: true,
      reason: "Requested Gemini provider is not configured on the server.",
    };
  }

  if (preferred === "openai") {
    if (openaiReady) return { provider: openaiProvider, fallbackUsed: false };
    return {
      provider: localFallbackProvider,
      fallbackUsed: true,
      reason: "Requested OpenAI provider is not configured on the server.",
    };
  }

  // Auto mode: honor explicit AI_PROVIDER env, otherwise prefer Gemini
  if (explicitEnv === "openai" && openaiReady) {
    return { provider: openaiProvider, fallbackUsed: false };
  }
  if (explicitEnv === "gemini" && geminiReady) {
    return { provider: geminiProvider, fallbackUsed: false };
  }
  if (geminiReady) return { provider: geminiProvider, fallbackUsed: false };
  if (openaiReady) return { provider: openaiProvider, fallbackUsed: false };

  return {
    provider: localFallbackProvider,
    fallbackUsed: true,
    reason:
      "No upstream LLM API key (API_KEY, GOOGLE_AI_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY) is configured on the server.",
  };
}

export function getAIProvider(type: PreferredProvider = "auto"): AIProvider {
  return resolveServerAIProvider(type).provider;
}

export { geminiProvider, openaiProvider, localFallbackProvider, localFallbackProvider as mockProvider };
export type {
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  StructuredAIOutput,
} from "./types";
