"use client";

import {
  useState,
  useRef,
  useEffect,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { SendHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  onSend: (message: string) => void;
  isGenerating: boolean;
}

/**
 * Auto-resizing multiline message composer.
 * Supports Enter to send and Shift+Enter for newline.
 */
export function ChatInput({ onSend, isGenerating }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
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

          <Button
            type="submit"
            variant="primary"
            size="icon"
            disabled={!value.trim() || isGenerating}
            aria-label={isGenerating ? "Generating response" : "Send message"}
            className="h-9 w-9 shrink-0 rounded-xl"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-foreground-muted/65">
          <span>Enter to send · Shift + Enter for new line</span>
          <span className="hidden sm:inline">
            Knowledge Search Mode · Verify medical suitability with clinic specialists
          </span>
        </div>
      </div>
    </form>
  );
}
