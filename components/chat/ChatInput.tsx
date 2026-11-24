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
 * Auto-resizing multiline message composer with Stop generation and optional external search toggle.
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
      className="border-t border-border bg-background/95 backdrop-blur-sm px-3 py-3 sm:px-6 sm:py-4"
    >
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background-secondary p-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            dir="auto"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder="Ask in English or Arabic about products, devices, clinic info, safety…"
            aria-label="Message Terra AI Assistant"
            className="flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-foreground placeholder:text-foreground-muted/50 focus:outline-none disabled:opacity-60 max-h-[168px]"
          />

          {isGenerating ? (
            <Button
              type="button"
              variant="danger"
              size="icon"
              onClick={onStop}
              aria-label="Stop generation"
              title="Stop generation"
              className="h-9 w-9 shrink-0 rounded-xl"
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
              className="h-9 w-9 shrink-0 rounded-xl"
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-foreground-muted/65">
          <span>Enter to send · Shift + Enter for new line</span>

          <div className="flex items-center gap-3">
            {onToggleExternalSearch && (
              <button
                type="button"
                disabled={!externalSearchAvailable || isGenerating}
                onClick={() => onToggleExternalSearch(!includeExternalSearch)}
                title={
                  externalSearchAvailable
                    ? "Optionally attach secondary Google Web Search results"
                    : "External Google Search is not configured on the server"
                }
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border transition-colors",
                  !externalSearchAvailable
                    ? "opacity-50 cursor-not-allowed border-border text-foreground-muted"
                    : includeExternalSearch
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border text-foreground-muted hover:text-foreground"
                )}
              >
                <Globe className="h-3 w-3" />
                <span>
                  {externalSearchAvailable
                    ? includeExternalSearch
                      ? "Web Search: On"
                      : "Web Search: Off"
                    : "Web Search Unavailable"}
                </span>
              </button>
            )}
            <span className="hidden md:inline">
              Verify medical suitability with clinic specialists
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}
