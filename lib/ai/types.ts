/**
 * AI provider types, structured rich response contract, error codes, and streaming events.
 */

import type { Message, MessageSource } from "@/types";
import type { RetrievalConfidence } from "@/types/knowledge";
import type { RetrievalOutput } from "@/lib/knowledge/retriever";
import type { ExternalSearchResult } from "@/lib/search/types";
import type { AIErrorCode, RichAIResponse } from "./response-schema";

export interface AIProviderConfig {
  id: "openai" | "gemini" | "mock" | "local_fallback";
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

/** Validated structured output produced by Gemini, OpenAI, or the deterministic fallback provider. */
export interface StructuredAIOutput {
  answer: string;
  language: "ar" | "en" | "mixed";
  intent: string;
  confidenceLevel: RetrievalConfidence;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  warnings: string[];
  structured?: RichAIResponse;
}

export interface AIResponse extends StructuredAIOutput {
  /** Backward-compatible Markdown alias equal to `answer`. */
  content: string;
  sources: MessageSource[];
  externalSources: MessageSource[];
  provider: string;
  isMock: boolean;
  errorCategory?: AIErrorCode;
  fallbackUsed?: boolean;
}

export type AIStreamChunk =
  | { type: "delta"; text: string }
  | { type: "complete"; response: AIResponse };

export interface ProviderValidationResult {
  configured: boolean;
  providerId: "openai" | "gemini" | "mock" | "local_fallback";
  reason?: string;
}

export interface AIProvider {
  config: AIProviderConfig;
  validateConfiguration(): ProviderValidationResult;
  normalizeError(err: unknown): string;
  generateResponse(request: AIRequest): Promise<AIResponse>;
  streamResponse?(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown>;
}
