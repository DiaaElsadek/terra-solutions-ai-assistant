import type { Message } from "./message";

/** A full conversation including all messages. */
export interface Conversation {
  /** Stable unique identifier (UUID v4). */
  id: string;
  /** User-visible title. Auto-generated from first message, editable. */
  title: string;
  /** Ordered list of messages. */
  messages: Message[];
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update (message added, title changed). */
  updatedAt: string;
}

/**
 * Lightweight summary used in the sidebar conversation list.
 * Does not include the full message array.
 */
export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Total number of messages. */
  messageCount: number;
  /** Preview text from the last message (truncated). */
  preview?: string;
}

