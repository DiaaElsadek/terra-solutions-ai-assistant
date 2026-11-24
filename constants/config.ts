/**
 * Application configuration constants.
 * Centralises storage keys, limits, and route paths.
 */

export const APP_CONFIG = {
  name: "Terra AI Assistant",
  version: "1.0.0",
  /** Bump this when the localStorage schema changes to trigger migration. */
  storageVersion: 1,
  /** Prefix for all localStorage keys. */
  storagePrefix: "terra_v1_",
  /** Maximum conversations stored locally. */
  maxConversations: 100,
  /** Maximum messages per conversation before pruning old ones. */
  maxMessagesPerConversation: 500,
  /** Max characters for a conversation title. */
  titleMaxLength: 60,
  /** Characters from first user message used to auto-generate a title. */
  titleAutoGenLength: 50,
} as const;

/** Stable localStorage key registry — never change existing keys. */
export const STORAGE_KEYS = {
  /** JSON array of ConversationSummary objects. */
  conversations: "terra_v1_conversations",
  /** ID of the currently active conversation. */
  activeConversation: "terra_v1_active_conversation",
  /** JSON-serialised AuthUser (demo adapter only). */
  authUser: "terra_v1_auth_user",
  /** Hashed session token (demo adapter only). */
  authSession: "terra_v1_auth_session",
  /** JSON-serialised UserPreferences. */
  preferences: "terra_v1_preferences",
  /** Schema version marker for migration detection. */
  schemaVersion: "terra_v1_schema_version",
} as const;

/**
 * Conversation-specific storage key.
 * Each conversation's messages are stored separately for performance.
 */
export function conversationKey(id: string): string {
  return `terra_v1_conv_${id}`;
}

/** Application route paths. */
export const ROUTES = {
  home: "/",
  signIn: "/signin",
  signUp: "/signup",
  chat: "/chat",
} as const;

