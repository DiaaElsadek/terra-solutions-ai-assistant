/**
 * Shared type definitions for Terra AI Assistant.
 * Re-exports all domain types from their respective modules.
 */

export type {
  Message,
  MessageRole,
  MessageStatus,
  MessageSource,
} from "./message";

export type { Conversation, ConversationSummary } from "./conversation";

export type {
  KnowledgeRecord,
  KnowledgeCategory,
  SearchResult,
  SearchOptions,
  KnowledgeCategoryInfo,
} from "./knowledge";

/** User preferences stored locally. */
export interface UserPreferences {
  sidebarCollapsed: boolean;
  lastActiveConversationId?: string;
}

/** Authenticated user (demo adapter). */
export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

