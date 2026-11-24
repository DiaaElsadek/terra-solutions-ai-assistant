"use client";

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { SendHorizontal, Square, Globe } from "lucide-react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isGenerating: boolean;
  externalSearchAvailable?: boolean;
  includeExternalSearch?: boolean;
  onToggleExternalSearch?: (next: boolean) => void;
}

/**
 * Grounded multiline message composer with RTL/LTR auto-direction,
 * Send/Stop states, keyboard shortcut support, and optional web supplement toggle.
 */
export function ChatInput({
  onSend,
  onStop,
  isGenerating,
  externalSearchAvailable = false,
  includeExternalSearch = false,
  onToggleExternalSearch,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setValue("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isGenerating) {
      onStop();
      return;
    }
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border/80 bg-background/95 backdrop-blur-xs px-3 py-3 sm:px-6 sm:py-3.5"
    >
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-xl border border-border bg-background-secondary px-3 py-2 transition-all duration-150 focus-within:border-primary/65 focus-within:ring-2 focus-within:ring-ring terra-subtle-shadow">
          <textarea
            ref={textareaRef}
            rows={1}
            dir="auto"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={
              isGenerating
                ? "Preparing verified answer…"
                : "Ask about services, prices, offers, or devices… · اسأل عن الخدمات أو الأسعار أو العروض أو الأجهزة..."
            }
            aria-label="Message Terra Solutions Assistant"
            className="flex-1 resize-none bg-transparent py-1.5 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none disabled:opacity-60 max-h-[168px] leading-relaxed"
          />

          {isGenerating ? (
            <Button
              type="button"
              variant="danger"
              size="icon"
              onClick={onStop}
              aria-label="Stop generating response"
              title="Stop generating"
              className="h-9 w-9 shrink-0 rounded-lg"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="icon"
              disabled={!value.trim()}
              aria-label="Send message"
              title="Send (Enter)"
              className="h-9 w-9 shrink-0 rounded-lg"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-foreground-muted/65">
          <span className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-block rounded border border-border bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
              Enter
            </kbd>
            <span className="hidden sm:inline">to send ·</span>
            <kbd className="hidden sm:inline-block rounded border border-border bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
              Shift + Enter
            </kbd>
            <span className="hidden sm:inline">new line</span>
            <span className="sm:hidden">Tap send or press Enter</span>
          </span>

          <div className="flex items-center gap-3">
            {externalSearchAvailable && onToggleExternalSearch && (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => onToggleExternalSearch(!includeExternalSearch)}
                title="Optionally include secondary external web results alongside company records"
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border transition-colors cursor-pointer",
                  includeExternalSearch
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-foreground-muted hover:text-foreground"
                )}
              >
                <Globe className="h-3 w-3" />
                <span>{includeExternalSearch ? "Web Reference: On" : "Web Reference: Off"}</span>
              </button>
            )}
            <span className="hidden md:inline text-foreground-muted/75">
              Confirm individual medical suitability with a clinic specialist
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
