/**
 * AI provider types, structured response contract, and streaming events.
 */

import type { Message, MessageSource } from "@/types";
import type { RetrievalConfidence } from "@/types/knowledge";
import type { RetrievalOutput } from "@/lib/knowledge/retriever";
import type { ExternalSearchResult } from "@/lib/search/types";

export interface AIProviderConfig {
  id: "openai" | "gemini" | "mock";
  name: string;
  isMock: boolean;
  model?: string;
  maxContextChars: number;
}

export interface AIRequest {
  userMessage: string;
  conversationHistory: Message[];
  systemPrompt: string;
  contextPackage: string;
  retrieval: RetrievalOutput;
  externalResults?: ExternalSearchResult[];
  externalSearchNote?: string;
  signal?: AbortSignal;
}

/** Validated structured output produced by real LLMs or the deterministic knowledge provider. */
export interface StructuredAIOutput {
  answer: string;
  language: "ar" | "en" | "mixed";
  intent: string;
  confidenceLevel: RetrievalConfidence;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  warnings: string[];
}

export interface AIResponse extends StructuredAIOutput {
  /** Backward-compatible Markdown alias equal to `answer`. */
  content: string;
  sources: MessageSource[];
  externalSources: MessageSource[];
  provider: string;
  isMock: boolean;
}

export type AIStreamChunk =
  | { type: "delta"; text: string }
  | { type: "complete"; response: AIResponse };

export interface ProviderValidationResult {
  configured: boolean;
  providerId: "openai" | "gemini" | "mock";
  reason?: string;
}

export interface AIProvider {
  config: AIProviderConfig;
  validateConfiguration(): ProviderValidationResult;
  normalizeError(err: unknown): string;
  generateResponse(request: AIRequest): Promise<AIResponse>;
  streamResponse?(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown>;
}
