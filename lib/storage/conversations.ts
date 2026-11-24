/**
 * Conversation persistence layer.
 * Stores conversation summaries in one key and each conversation's
 * messages in a separate key for performance.
 *
 * Schema:
 *   terra_v1_conversations        → ConversationSummary[]
 *   terra_v1_conv_{id}            → Message[]
 *   terra_v1_active_conversation  → string (conversation ID)
 */

import { v4 as uuidv4 } from "uuid";
import type { Conversation, ConversationSummary, Message } from "@/types";
import { STORAGE_KEYS, conversationKey, APP_CONFIG } from "@/constants/config";
import * as storage from "./local-storage";

/** Get all conversation summaries, sorted by most recent first. */
export function listConversations(): ConversationSummary[] {
  const items = storage.getItem<ConversationSummary[]>(
    STORAGE_KEYS.conversations,
    []
  );
  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** Get a full conversation by ID, including messages. */
export function getConversation(id: string): Conversation | null {
  const summaries = listConversations();
  const summary = summaries.find((s) => s.id === id);
  if (!summary) return null;

  const messages = storage.getItem<Message[]>(conversationKey(id), []);
  return {
    id: summary.id,
    title: summary.title,
    messages,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
  };
}

/** Create a new empty conversation and return it. */
export function createConversation(title = "New Conversation"): Conversation {
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id: uuidv4(),
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  const summaries = listConversations();

  // Enforce max conversations — remove oldest if at limit
  if (summaries.length >= APP_CONFIG.maxConversations) {
    const oldest = summaries[summaries.length - 1];
    deleteConversation(oldest.id);
  }

  const summary: ConversationSummary = {
    id: conversation.id,
    title: conversation.title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };

  summaries.unshift(summary);
  storage.setItem(STORAGE_KEYS.conversations, summaries);
  storage.setItem(conversationKey(conversation.id), []);
  setActiveConversationId(conversation.id);

  return conversation;
}

/** Add a message to a conversation. */
export function addMessage(conversationId: string, message: Message): boolean {
  const messages = storage.getItem<Message[]>(
    conversationKey(conversationId),
    []
  );
  messages.push(message);

  // Enforce max messages
  if (messages.length > APP_CONFIG.maxMessagesPerConversation) {
    messages.splice(0, messages.length - APP_CONFIG.maxMessagesPerConversation);
  }

  const msgSaved = storage.setItem(conversationKey(conversationId), messages);
  if (!msgSaved) return false;

  // Update summary
  const summaries = storage.getItem<ConversationSummary[]>(
    STORAGE_KEYS.conversations,
    []
  );
  const idx = summaries.findIndex((s) => s.id === conversationId);
  if (idx !== -1) {
    summaries[idx].updatedAt = new Date().toISOString();
    summaries[idx].messageCount = messages.length;
    summaries[idx].preview =
      message.content.slice(0, 80) + (message.content.length > 80 ? "…" : "");
    storage.setItem(STORAGE_KEYS.conversations, summaries);
  }

  return true;
}

/** Update the last message in a conversation (for streaming/retry). */
export function updateLastMessage(
  conversationId: string,
  updater: (msg: Message) => Message
): void {
  const messages = storage.getItem<Message[]>(
    conversationKey(conversationId),
    []
  );
  if (messages.length === 0) return;
  messages[messages.length - 1] = updater(messages[messages.length - 1]);
  storage.setItem(conversationKey(conversationId), messages);
}

/** Rename a conversation. */
export function renameConversation(id: string, newTitle: string): void {
  const title = newTitle.trim().slice(0, APP_CONFIG.titleMaxLength);
  if (!title) return;

  const summaries = storage.getItem<ConversationSummary[]>(
    STORAGE_KEYS.conversations,
    []
  );
  const idx = summaries.findIndex((s) => s.id === id);
  if (idx !== -1) {
    summaries[idx].title = title;
    summaries[idx].updatedAt = new Date().toISOString();
    storage.setItem(STORAGE_KEYS.conversations, summaries);
  }
}

/** Delete a conversation and its messages. */
export function deleteConversation(id: string): void {
  const summaries = storage.getItem<ConversationSummary[]>(
    STORAGE_KEYS.conversations,
    []
  );
  const filtered = summaries.filter((s) => s.id !== id);
  storage.setItem(STORAGE_KEYS.conversations, filtered);
  storage.removeItem(conversationKey(id));

  // If this was the active conversation, clear it
  if (getActiveConversationId() === id) {
    storage.removeItem(STORAGE_KEYS.activeConversation);
  }
}

/** Clear all messages from a conversation without deleting it. */
export function clearConversationMessages(id: string): void {
  storage.setItem(conversationKey(id), []);
  const summaries = storage.getItem<ConversationSummary[]>(
    STORAGE_KEYS.conversations,
    []
  );
  const idx = summaries.findIndex((s) => s.id === id);
  if (idx !== -1) {
    summaries[idx].messageCount = 0;
    summaries[idx].preview = undefined;
    summaries[idx].updatedAt = new Date().toISOString();
    storage.setItem(STORAGE_KEYS.conversations, summaries);
  }
}

/** Auto-generate a title from the first user message. */
export function autoTitle(firstMessage: string): string {
  const cleaned = firstMessage
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, APP_CONFIG.titleAutoGenLength);
  return cleaned + (firstMessage.length > APP_CONFIG.titleAutoGenLength ? "…" : "");
}

/** Get the currently active conversation ID. */
export function getActiveConversationId(): string | null {
  return storage.getItem<string | null>(STORAGE_KEYS.activeConversation, null);
}

/** Set the active conversation ID. */
export function setActiveConversationId(id: string): void {
  storage.setItem(STORAGE_KEYS.activeConversation, id);
}

/** Search conversations by title (case-insensitive). */
export function searchConversations(query: string): ConversationSummary[] {
  if (!query.trim()) return listConversations();
  const q = query.toLowerCase();
  return listConversations().filter((c) =>
    c.title.toLowerCase().includes(q)
  );
}

/** Delete all conversations and their messages. */
export function deleteAllConversations(): void {
  const summaries = listConversations();
  summaries.forEach((s) => storage.removeItem(conversationKey(s.id)));
  storage.setItem(STORAGE_KEYS.conversations, []);
  storage.removeItem(STORAGE_KEYS.activeConversation);
}

