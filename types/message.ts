import type { RetrievalConfidence } from "./knowledge";
import type { AIErrorCode, RichAIResponse } from "@/lib/ai/response-schema";

/** Role of a message within a conversation. */
export type MessageRole = "user" | "assistant" | "system";

/** Delivery status of a message. */
export type MessageStatus = "sending" | "streaming" | "sent" | "error";

/** Source attribution attached to an AI response. */
export interface MessageSource {
  /** Display-friendly category name. */
  category: string;
  /** Short title or record name. */
  title: string;
  /** Whether the source is from internal company data or external web search. */
  type: "knowledge" | "external";
  /** Original source file (e.g., "Knowlege.xlsx" or "clinics.json"). */
  file?: string;
  /** Original Excel worksheet name. */
  sheet?: string;
  /** Primary 1-based Excel row number. */
  row?: number;
  /** All contributing 1-based Excel rows. */
  rows?: number[];
  /** Retrieval relevance score. */
  confidenceScore?: number;
  /** Explainable reasons why this record matched. */
  matchReasons?: string[];
  /** Optional URL for external web sources. */
  url?: string;
  /** Optional snippet or publication date for external sources. */
  snippet?: string;
  publishedAt?: string;
}

/** A single message in a conversation. */
export interface Message {
  /** Stable unique identifier (UUID v4). */
  id: string;
  /** Who sent the message. */
  role: MessageRole;
  /** Message body — plain text or Markdown. */
  content: string;
  /** ISO-8601 timestamp of when the message was created. */
  timestamp: string;
  /** Current delivery status. */
  status: MessageStatus;
  /** Sources referenced in this response (assistant messages only). */
  sources?: MessageSource[];
  /** External web search sources (always distinct from official company records). */
  externalSources?: MessageSource[];
  /** Classified intent for this turn. */
  intent?: string;
  /** Retrieval confidence tier. */
  confidenceLevel?: RetrievalConfidence;
  /** Whether the assistant requested clarification from the agent. */
  requiresClarification?: boolean;
  clarificationQuestion?: string;
  /** Warnings (e.g. source conflicts, missing pricing, medical safety reminder). */
  warnings?: string[];
  /** Provider name used to generate this message. */
  provider?: string;
  /** Whether this message came from deterministic local fallback mode rather than live LLM synthesis. */
  isMock?: boolean;
  /** Structured semantic response blocks validated on the backend. */
  structured?: RichAIResponse;
  /** Operational error category if fallback was activated due to an upstream issue. */
  errorCategory?: AIErrorCode;
  /** Human-readable error description when status is 'error'. */
  errorMessage?: string;
}
