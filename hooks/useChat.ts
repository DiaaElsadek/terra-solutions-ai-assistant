"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Conversation, Message, MessageSource } from "@/types";
import type { AIResponse } from "@/lib/ai/types";
import * as convStore from "@/lib/storage/conversations";

export interface ProviderStatusInfo {
  activeProvider: "openai" | "gemini" | "mock";
  providerName: string;
  isMock: boolean;
  externalSearchAvailable: boolean;
  reason?: string;
}

interface UseChatOptions {
  activeConversation: Conversation | null;
  setActiveConversation: (conv: Conversation | null) => void;
  createNewChat: () => Conversation;
  refreshSummaries: () => void;
}

interface StreamMetaFrame {
  type: "meta";
  provider: string;
  isMock: boolean;
  intent: string;
  confidenceLevel: AIResponse["confidenceLevel"];
  sources: MessageSource[];
  externalSources: MessageSource[];
}

interface StreamDeltaFrame {
  type: "delta";
  text: string;
}

interface StreamDoneFrame {
  type: "done";
  payload: AIResponse;
}

interface StreamErrorFrame {
  type: "error";
  error: string;
}

type StreamFrame =
  | StreamMetaFrame
  | StreamDeltaFrame
  | StreamDoneFrame
  | StreamErrorFrame;

/**
 * Encapsulates conversational messaging via server-side `/api/chat` NDJSON streaming,
 * AbortController cancellation, retries, and localStorage persistence.
 */
export function useChat({
  activeConversation,
  setActiveConversation,
  createNewChat,
  refreshSummaries,
}: UseChatOptions) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [includeExternalSearch, setIncludeExternalSearch] = useState(false);
  const [providerStatus, setProviderStatus] =
    useState<ProviderStatusInfo | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProviderStatusInfo | null) => {
        if (active && data) {
          setProviderStatus(data);
        }
      })
      .catch(() => {
        /* Keep default status */
      });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const executeStreamingTurn = useCallback(
    async (
      convId: string,
      queryText: string,
      historyBeforeTurn: Message[],
      baseConv: Conversation
    ) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);

      const assistantId = uuidv4();
      const createdTs = new Date().toISOString();
      let streamedText = "";
      let metaSources: MessageSource[] = [];
      let metaExternalSources: MessageSource[] = [];
      let metaProvider = providerStatus?.providerName || "Terra Knowledge Search";
      let metaIsMock = providerStatus?.isMock ?? true;
      let completedPayload: AIResponse | null = null;

      const updateStreamingUI = (partialMsg: Message) => {
        if (convStore.getActiveConversationId() === convId) {
          setActiveConversation({
            ...baseConv,
            messages: [...historyBeforeTurn, partialMsg],
            updatedAt: new Date().toISOString(),
          });
        }
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message: queryText,
            history: historyBeforeTurn
              .filter((m) => m.role !== "system" && m.status !== "error")
              .slice(-12)
              .map((m) => ({ role: m.role, content: m.content })),
            includeExternalSearch,
            stream: true,
          }),
        });

        if (!res.ok) {
          let errMsg = `Request failed (HTTP ${res.status}).`;
          try {
            const errBody = (await res.json()) as { error?: string };
            if (errBody.error) errMsg = errBody.error;
          } catch {
            /* ignore */
          }
          throw new Error(errMsg);
        }

        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error("Streaming response body is unavailable.");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const frame = JSON.parse(trimmed) as StreamFrame;

            if (frame.type === "meta") {
              metaSources = frame.sources;
              metaExternalSources = frame.externalSources;
              metaProvider = frame.provider;
              metaIsMock = frame.isMock;
            } else if (frame.type === "delta") {
              streamedText += frame.text;
              updateStreamingUI({
                id: assistantId,
                role: "assistant",
                content: streamedText,
                timestamp: createdTs,
                status: "streaming",
                sources: metaSources,
                externalSources: metaExternalSources,
                provider: metaProvider,
                isMock: metaIsMock,
              });
            } else if (frame.type === "done") {
              completedPayload = frame.payload;
            } else if (frame.type === "error") {
              throw new Error(frame.error);
            }
          }
        }

        if (completedPayload) {
          const finalMsg: Message = {
            id: assistantId,
            role: "assistant",
            content: completedPayload.answer,
            timestamp: createdTs,
            status: "sent",
            sources: completedPayload.sources,
            externalSources: completedPayload.externalSources,
            intent: completedPayload.intent,
            confidenceLevel: completedPayload.confidenceLevel,
            requiresClarification: completedPayload.requiresClarification,
            clarificationQuestion: completedPayload.clarificationQuestion,
            warnings: completedPayload.warnings,
            provider: completedPayload.provider,
            isMock: completedPayload.isMock,
          };
          convStore.addMessage(convId, finalMsg);
        } else if (streamedText.trim()) {
          // Preserve partial response safely if stream closed early
          convStore.addMessage(convId, {
            id: assistantId,
            role: "assistant",
            content: streamedText,
            timestamp: createdTs,
            status: "sent",
            sources: metaSources,
            externalSources: metaExternalSources,
            warnings: ["Response stream ended early."],
            provider: metaProvider,
            isMock: metaIsMock,
          });
        }

        const latest = convStore.getConversation(convId);
        if (latest && convStore.getActiveConversationId() === convId) {
          setActiveConversation(latest);
        }
        refreshSummaries();
      } catch (err) {
        if (controller.signal.aborted) {
          const partialContent = streamedText.trim();
          const stoppedMsg: Message = partialContent
            ? {
                id: assistantId,
                role: "assistant",
                content: partialContent,
                timestamp: createdTs,
                status: "sent",
                sources: metaSources,
                externalSources: metaExternalSources,
                warnings: ["Generation stopped by agent."],
                provider: metaProvider,
                isMock: metaIsMock,
              }
            : {
                id: assistantId,
                role: "assistant",
                content: "",
                timestamp: createdTs,
                status: "error",
                errorMessage: "Generation cancelled.",
              };
          convStore.addMessage(convId, stoppedMsg);
        } else {
          convStore.addMessage(convId, {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: createdTs,
            status: "error",
            errorMessage:
              err instanceof Error
                ? err.message
                : "Failed to retrieve an answer from Terra AI.",
          });
        }

        const latest = convStore.getConversation(convId);
        if (latest && convStore.getActiveConversationId() === convId) {
          setActiveConversation(latest);
        }
        refreshSummaries();
      } finally {
        abortRef.current = null;
        setIsGenerating(false);
      }
    },
    [
      includeExternalSearch,
      providerStatus?.isMock,
      providerStatus?.providerName,
      refreshSummaries,
      setActiveConversation,
    ]
  );

  const sendMessage = useCallback(
    async (rawText: string, overrideConversation?: Conversation) => {
      const text = rawText.trim();
      if (!text || isGenerating) return;

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

      if (isFirstMessage) {
        convStore.renameConversation(convId, convStore.autoTitle(text));
      }

      const savedUser = convStore.addMessage(convId, userMessage);
      setStorageWarning(
        savedUser
          ? null
          : "Browser storage is full. Older conversations may need to be cleared."
      );

      const historyWithUser = [...targetConv.messages, userMessage];
      const updatedAfterUser: Conversation = {
        ...targetConv,
        title: isFirstMessage ? convStore.autoTitle(text) : targetConv.title,
        messages: historyWithUser,
        updatedAt: new Date().toISOString(),
      };
      setActiveConversation(updatedAfterUser);
      refreshSummaries();

      await executeStreamingTurn(convId, text, historyWithUser, updatedAfterUser);
    },
    [
      activeConversation,
      createNewChat,
      executeStreamingTurn,
      isGenerating,
      refreshSummaries,
      setActiveConversation,
    ]
  );

  const retryLastResponse = useCallback(async () => {
    if (!activeConversation || isGenerating) return;

    const msgs = [...activeConversation.messages];
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
    const trimmedMessages = msgs.slice(0, lastUserIndex + 1);

    convStore.clearConversationMessages(convId);
    for (const m of trimmedMessages) {
      convStore.addMessage(convId, m);
    }

    const resetConv = convStore.getConversation(convId);
    if (!resetConv) return;
    setActiveConversation(resetConv);

    await executeStreamingTurn(convId, queryText, trimmedMessages, resetConv);
  }, [
    activeConversation,
    executeStreamingTurn,
    isGenerating,
    setActiveConversation,
  ]);

  const clearCurrentConversation = useCallback(() => {
    if (!activeConversation) return;
    if (isGenerating) stopGeneration();
    convStore.clearConversationMessages(activeConversation.id);
    const updated = convStore.getConversation(activeConversation.id);
    setActiveConversation(updated);
    refreshSummaries();
  }, [
    activeConversation,
    isGenerating,
    refreshSummaries,
    setActiveConversation,
    stopGeneration,
  ]);

  return {
    isGenerating,
    storageWarning,
    providerStatus,
    includeExternalSearch,
    setIncludeExternalSearch,
    sendMessage,
    stopGeneration,
    retryLastResponse,
    clearCurrentConversation,
  };
}
