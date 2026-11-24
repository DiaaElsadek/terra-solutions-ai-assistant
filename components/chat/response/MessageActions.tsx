"use client";

import { useState } from "react";
import { Check, Copy, RotateCcw, ThumbsDown, ThumbsUp } from "lucide-react";
import { clsx } from "clsx";

interface MessageActionsProps {
  onCopyResponse: () => void;
  copied: boolean;
  keyHighlightsText?: string;
  isLastAssistant?: boolean;
  isStreaming?: boolean;
  onRetry?: () => void;
}

/**
 * Restrained assistant action bar supporting full response copy, quick numeric/price
 * highlights copy mid-call, retry on the latest turn, and lightweight feedback.
 */
export function MessageActions({
  onCopyResponse,
  copied,
  keyHighlightsText,
  isLastAssistant = false,
  isStreaming = false,
  onRetry,
}: MessageActionsProps) {
  const [highlightsCopied, setHighlightsCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleCopyHighlights = async () => {
    if (!keyHighlightsText) return;
    try {
      await navigator.clipboard.writeText(keyHighlightsText);
      setHighlightsCopied(true);
      setTimeout(() => setHighlightsCopied(false), 1600);
    } catch {
      /* Clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={onCopyResponse}
          aria-label="Copy full answer"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy response</span>
            </>
          )}
        </button>

        {keyHighlightsText && (
          <button
            type="button"
            onClick={() => void handleCopyHighlights()}
            aria-label="Copy key metrics and prices"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-primary hover:bg-background-tertiary transition-colors cursor-pointer"
          >
            {highlightsCopied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Key details copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy key numbers</span>
              </>
            )}
          </button>
        )}

        {isLastAssistant && onRetry && !isStreaming && (
          <button
            type="button"
            onClick={onRetry}
            aria-label="Regenerate response"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Retry</span>
          </button>
        )}
      </div>

      {!isStreaming && (
        <div
          className="flex items-center gap-0.5 sm:opacity-65 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
          role="group"
          aria-label="Response feedback"
        >
          <button
            type="button"
            onClick={() => setFeedback((prev) => (prev === "up" ? null : "up"))}
            aria-label="Mark response helpful"
            aria-pressed={feedback === "up"}
            title="Helpful response"
            className={clsx(
              "p-1 rounded-md transition-colors cursor-pointer",
              feedback === "up"
                ? "text-emerald-400 bg-emerald-500/12"
                : "text-foreground-muted/70 hover:text-foreground hover:bg-background-tertiary"
            )}
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setFeedback((prev) => (prev === "down" ? null : "down"))}
            aria-label="Mark response needs improvement"
            aria-pressed={feedback === "down"}
            title="Needs clarification"
            className={clsx(
              "p-1 rounded-md transition-colors cursor-pointer",
              feedback === "down"
                ? "text-amber-400 bg-amber-500/12"
                : "text-foreground-muted/70 hover:text-foreground hover:bg-background-tertiary"
            )}
          >
            <ThumbsDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

