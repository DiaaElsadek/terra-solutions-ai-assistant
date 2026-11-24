/**
 * AI provider factory.
 * Returns the appropriate AI provider based on configuration.
 *
 * Currently returns the mock provider.
 * When a real LLM API key is configured, this factory should
 * return a provider that calls the Next.js API route at /api/chat.
 */

import type { AIProvider } from "./types";
import { mockProvider } from "./mock-provider";

export type ProviderType = "mock" | "api";

/**
 * Get the AI provider instance.
 * In the initial frontend-only release, this returns the knowledge-backed mock provider.
 */
export function getAIProvider(type: ProviderType = "mock"): AIProvider {
  if (type === "api") {
    // Future: return an API-backed provider calling POST /api/chat
    return mockProvider;
  }
  return mockProvider;
}

export { mockProvider };
export type { AIProvider, AIProviderConfig, AIRequest, AIResponse } from "./types";

