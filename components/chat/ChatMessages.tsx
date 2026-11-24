"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
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
        <div className="w-full max-w-3xl flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/15 to-background-secondary terra-subtle-shadow">
            <Image
              src="/images/T_logo.svg"
              alt="Terra Solutions"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
              priority
            />
          </div>

          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 px-3 py-0.5 text-[11px] font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
            Terra Solutions Assistant
          </span>

          <h2
            dir="rtl"
            className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight"
          >
            أهلًا بيك، إزاي أقدر أساعدك النهارده؟
          </h2>
          <p className="mt-1 font-display text-sm sm:text-base font-medium text-terra-gold-light/90">
            Instant, source-backed answers for call center &amp; support teams
          </p>
          <p className="mt-2 mb-7 text-xs sm:text-[13px] text-foreground-muted max-w-lg leading-relaxed">
            Ask in Arabic or English about treatments, package prices, medical
            devices, clinic availability, and safety contraindications.
          </p>

          <SuggestedPrompts onSelect={onSelectPrompt} disabled={isGenerating} />
        </div>
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

