/** Role of a message within a conversation. */
export type MessageRole = "user" | "assistant" | "system";

/** Delivery status of a message. */
export type MessageStatus = "sending" | "sent" | "error";

/** Source attribution attached to an AI response. */
export interface MessageSource {
  /** Display-friendly category name. */
  category: string;
  /** Short title or record name. */
  title: string;
  /** Whether the source is from the internal knowledge base or external. */
  type: "knowledge" | "external";
  /** Optional URL for external sources. */
  url?: string;
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
  /** Human-readable error description when status is 'error'. */
  errorMessage?: string;
}

