"use client";

import { useEffect, useRef } from "react";
import { BrandLogo } from "@/components/ui/BrandLogo";
import type { Message } from "@/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { SuggestedPrompts } from "./SuggestedPrompts";

interface ChatMessagesProps {
  messages: Message[];
  isGenerating: boolean;
  userName?: string;
  onSelectPrompt: (prompt: string) => void;
  onRetry: () => void;
}

/**
 * Scrollable conversation area with automatic scroll-to-bottom
 * and empty-state prompt suggestions.
 */
export function ChatMessages({
  messages,
  isGenerating,
  userName,
  onSelectPrompt,
  onRetry,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isGenerating]);

  // Find index of the last assistant message for retry action
  let lastAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      lastAssistantIdx = i;
      break;
    }
  }

  if (messages.length === 0 && !isGenerating) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 flex flex-col items-center justify-center">
        <div className="mb-5 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-3">
          <BrandLogo href="" compact size="md" priority />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground text-center">
          How can I assist your call today?
        </h2>
        <p className="mt-2 mb-8 text-sm text-foreground-muted text-center max-w-lg leading-relaxed">
          Ask in English or Arabic about Terra Solutions products, aesthetic devices,
          clinic services, or safety rules. Answers are grounded strictly in the company Excel data.
        </p>

        <SuggestedPrompts onSelect={onSelectPrompt} disabled={isGenerating} />
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-6 space-y-6"
      role="log"
      aria-live="polite"
      aria-label="Conversation messages"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            userName={userName}
            isLastAssistant={idx === lastAssistantIdx}
            onRetry={onRetry}
          />
        ))}
        {isGenerating && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

