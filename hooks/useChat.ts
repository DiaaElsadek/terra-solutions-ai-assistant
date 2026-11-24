"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Conversation, Message } from "@/types";
import { getAIProvider } from "@/lib/ai/provider";
import { SYSTEM_PROMPT } from "@/constants/prompts";
import * as convStore from "@/lib/storage/conversations";

interface UseChatOptions {
  activeConversation: Conversation | null;
  setActiveConversation: (conv: Conversation | null) => void;
  createNewChat: () => Conversation;
  refreshSummaries: () => void;
}

/**
 * Encapsulates conversational message sending, AI response generation,
 * retries, clearing, and localStorage persistence.
 */
export function useChat({
  activeConversation,
  setActiveConversation,
  createNewChat,
  refreshSummaries,
}: UseChatOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (rawText: string, overrideConversation?: Conversation) => {
      const text = rawText.trim();
      if (!text || isGenerating) return;

      // Ensure we have an active conversation
      let targetConv = overrideConversation ?? activeConversation;
      if (!targetConv) {
        targetConv = createNewChat();
      }

      const convId = targetConv.id;
      const isFirstMessage = targetConv.messages.length === 0;

      const userMessage: Message = {
        id: uuidv4(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
        status: "sent",
      };

      // Auto-generate conversation title from first message
      if (isFirstMessage) {
        const title = convStore.autoTitle(text);
        convStore.renameConversation(convId, title);
      }

      const savedUser = convStore.addMessage(convId, userMessage);
      if (!savedUser) {
        setStorageWarning(
          "Browser storage is full. Older conversations may need to be cleared."
        );
      } else {
        setStorageWarning(null);
      }

      const updatedAfterUser: Conversation = {
        ...targetConv,
        title: isFirstMessage ? convStore.autoTitle(text) : targetConv.title,
        messages: [...targetConv.messages, userMessage],
        updatedAt: new Date().toISOString(),
      };
      setActiveConversation(updatedAfterUser);
      refreshSummaries();

      setIsGenerating(true);

      try {
        const provider = getAIProvider("mock");
        const aiResult = await provider.generateResponse({
          userMessage: text,
          conversationHistory: updatedAfterUser.messages,
          systemPrompt: SYSTEM_PROMPT,
        });

        const assistantMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: aiResult.content,
          timestamp: new Date().toISOString(),
          status: "sent",
          sources: aiResult.sources,
        };

        convStore.addMessage(convId, assistantMessage);

        // Only update state if user is still viewing this conversation
        const latest = convStore.getConversation(convId);
        if (latest && convStore.getActiveConversationId() === convId) {
          setActiveConversation(latest);
        }
        refreshSummaries();
      } catch (err) {
        const errorMessage: Message = {
          id: uuidv4(),
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
          status: "error",
          errorMessage:
            err instanceof Error
              ? err.message
              : "Failed to retrieve an answer from the knowledge engine.",
        };

        convStore.addMessage(convId, errorMessage);
        const latest = convStore.getConversation(convId);
        if (latest && convStore.getActiveConversationId() === convId) {
          setActiveConversation(latest);
        }
        refreshSummaries();
      } finally {
        setIsGenerating(false);
      }
    },
    [
      activeConversation,
      createNewChat,
      isGenerating,
      refreshSummaries,
      setActiveConversation,
    ]
  );

  /** Retry the failed or last user prompt in the active conversation. */
  const retryLastResponse = useCallback(async () => {
    if (!activeConversation || isGenerating) return;

    const msgs = [...activeConversation.messages];
    // Find the last user message
    let lastUserIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex === -1) return;

    const queryText = msgs[lastUserIndex].content;
    const convId = activeConversation.id;

    // Remove trailing assistant error/response message if present
    const trimmedMessages = msgs.slice(0, lastUserIndex + 1);
    convStore.clearConversationMessages(convId);
    for (const m of trimmedMessages) {
      convStore.addMessage(convId, m);
    }

    const resetConv = convStore.getConversation(convId);
    if (resetConv) {
      setActiveConversation(resetConv);
    }

    setIsGenerating(true);
    try {
      const provider = getAIProvider("mock");
      const aiResult = await provider.generateResponse({
        userMessage: queryText,
        conversationHistory: trimmedMessages,
        systemPrompt: SYSTEM_PROMPT,
      });

      const assistantMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: aiResult.content,
        timestamp: new Date().toISOString(),
        status: "sent",
        sources: aiResult.sources,
      };

      convStore.addMessage(convId, assistantMessage);
      const latest = convStore.getConversation(convId);
      if (latest && convStore.getActiveConversationId() === convId) {
        setActiveConversation(latest);
      }
      refreshSummaries();
    } catch (err) {
      const errorMessage: Message = {
        id: uuidv4(),
        role: "assistant",
        content: "",
        timestamp: new Date().toISOString(),
        status: "error",
        errorMessage:
          err instanceof Error
            ? err.message
            : "Retry failed. Please try again.",
      };
      convStore.addMessage(convId, errorMessage);
      const latest = convStore.getConversation(convId);
      if (latest && convStore.getActiveConversationId() === convId) {
        setActiveConversation(resetConv ? latest : null);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [
    activeConversation,
    isGenerating,
    refreshSummaries,
    setActiveConversation,
  ]);

  /** Clear all messages in the current conversation. */
  const clearCurrentConversation = useCallback(() => {
    if (!activeConversation) return;
    convStore.clearConversationMessages(activeConversation.id);
    const updated = convStore.getConversation(activeConversation.id);
    setActiveConversation(updated);
    refreshSummaries();
  }, [activeConversation, refreshSummaries, setActiveConversation]);

  return {
    isGenerating,
    storageWarning,
    sendMessage,
    retryLastResponse,
    clearCurrentConversation,
  };
}
