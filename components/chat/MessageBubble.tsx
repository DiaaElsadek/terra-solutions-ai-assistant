"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import type { Message } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface MessageBubbleProps {
  message: Message;
  userName?: string;
  isLastAssistant?: boolean;
  onRetry?: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Renders either a user message bubble or a structured AI response message.
 */
export function MessageBubble({
  message,
  userName,
  isLastAssistant = false,
  onRetry,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard unavailable */
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3 max-w-3xl ms-auto w-full">
        <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
          <div
            dir="auto"
            className="rounded-2xl rounded-tr-sm bg-user-bubble text-user-bubble-foreground px-4 py-2.5 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words shadow-sm"
          >
            {message.content}
          </div>
          <span
            suppressHydrationWarning
            className="text-[11px] text-foreground-muted/60 px-1"
          >
            {formatTime(message.timestamp)}
          </span>
        </div>
        <Avatar name={userName} variant="user" size="md" />
      </div>
    );
  }

  // Error message state
  if (message.status === "error") {
    return (
      <div className="flex items-start gap-3 max-w-3xl w-full">
        <Avatar variant="assistant" size="md" />
        <div className="rounded-2xl rounded-tl-sm border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 space-y-3 max-w-[85%]">
          <div className="flex items-center gap-2 font-medium text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Failed to retrieve response</span>
          </div>
          <p className="text-xs text-red-200/80">
            {message.errorMessage || "An unexpected error occurred."}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Assistant response
  return (
    <div className="group flex items-start gap-3 max-w-3xl w-full">
      <Avatar variant="assistant" size="md" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="rounded-2xl rounded-tl-sm bg-ai-bubble border border-border px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm">
          <MarkdownRenderer content={message.content} />

          {/* Source attribution pills */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/70 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground-muted/80 me-1">
                <FileSpreadsheet className="h-3 w-3 text-primary" />
                Sources:
              </span>
              {message.sources.map((src, idx) => (
                <span
                  key={`${src.category}-${src.title}-${idx}`}
                  className="inline-flex items-center gap-1 rounded-md bg-background-secondary border border-border px-2 py-0.5 text-[11px] text-terra-gold-pale"
                >
                  <span className="text-primary font-medium">{src.category}:</span>
                  <span className="truncate max-w-[180px]">{src.title}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Message footer actions */}
        <div className="flex items-center justify-between px-1">
          <span
            suppressHydrationWarning
            className="text-[11px] text-foreground-muted/60"
          >
            {formatTime(message.timestamp)}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy response"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {isLastAssistant && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                aria-label="Regenerate response"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

