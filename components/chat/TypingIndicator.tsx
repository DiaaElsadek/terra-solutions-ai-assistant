import { Avatar } from "@/components/ui/Avatar";

/**
 * Animated typing indicator displayed while the knowledge engine processes a query.
 */
export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Terra AI is searching the knowledge base"
      className="flex items-start gap-3 max-w-3xl"
    >
      <Avatar variant="assistant" size="md" />
      <div className="rounded-2xl rounded-tl-sm bg-ai-bubble border border-border px-4 py-3 flex items-center gap-2">
        <span className="text-xs text-foreground-muted">
          Searching company knowledge
        </span>
        <span className="inline-flex items-center gap-1" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
        </span>
      </div>
    </div>
  );
}

