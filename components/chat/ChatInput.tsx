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

const MAX_MESSAGE_CHARS = 2000;

/**
 * Elevated multilingual message composer supporting RTL/LTR auto-direction,
 * Send/Stop states, keyboard shortcuts, optional web supplement toggle, and safe mobile padding.
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
    if (!trimmed || isGenerating || trimmed.length > MAX_MESSAGE_CHARS) return;
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

  const remaining = MAX_MESSAGE_CHARS - value.length;
  const showCounter = value.length >= 1500;
  const overLimit = value.length > MAX_MESSAGE_CHARS;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border/80 bg-background/95 backdrop-blur-xs px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-3.5"
    >
      <div className="mx-auto max-w-3xl">
        <div
          className={clsx(
            "terra-panel relative flex items-end gap-2 rounded-2xl px-3.5 py-2 transition-all duration-150 focus-within:border-primary/65 focus-within:ring-2 focus-within:ring-ring",
            overLimit && "border-red-500/60 focus-within:border-red-500 focus-within:ring-red-500/30"
          )}
        >
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
                : "Ask about services, prices, devices, clinics, or safety… (اسأل بالعربي أو الإنجليزي)"
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
              className="h-9 w-9 shrink-0 rounded-xl"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              size="icon"
              disabled={!value.trim() || overLimit}
              aria-label="Send message"
              title="Send (Enter)"
              className="h-9 w-9 shrink-0 rounded-xl"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-foreground-muted/65">
          <span className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-block rounded border border-border bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
              Enter
            </kbd>
            <span className="hidden sm:inline">send ·</span>
            <kbd className="hidden sm:inline-block rounded border border-border bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
              Shift + Enter
            </kbd>
            <span className="hidden sm:inline">new line ·</span>
            <kbd className="hidden md:inline-block rounded border border-border bg-background-secondary px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
              /
            </kbd>
            <span className="hidden md:inline">search history</span>
            <span className="sm:hidden">Tap send or press Enter</span>
          </span>

          <div className="flex items-center gap-3">
            {showCounter && (
              <span
                className={clsx(
                  "font-mono tabular-nums",
                  overLimit ? "text-red-400 font-semibold" : "text-amber-300"
                )}
              >
                {remaining} chars left
              </span>
            )}

            {externalSearchAvailable && onToggleExternalSearch && (
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => onToggleExternalSearch(!includeExternalSearch)}
                title="Optionally include secondary external web results alongside company records"
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 border transition-colors cursor-pointer",
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
              Grounded in Terra Solutions KB · Refer clinical assessments to doctors
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
