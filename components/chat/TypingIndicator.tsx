import { Avatar } from "@/components/ui/Avatar";

/**
 * Calm branded loading state shown while Terra Assistant prepares an answer.
 */
export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Terra Assistant is preparing your answer"
      className="flex items-start gap-3.5 max-w-3xl terra-animate-in"
    >
      <Avatar variant="assistant" size="md" />
      <div className="flex-1 min-w-0 pt-1 space-y-2 border-s-2 border-primary/30 ps-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-display font-semibold text-foreground">
            Terra Assistant
          </span>
          <span className="text-xs text-foreground-muted">
            Preparing your answer…
          </span>
        </div>
        <div className="space-y-1.5 max-w-md" aria-hidden="true">
          <div className="h-2 rounded-full terra-shimmer w-3/4" />
          <div className="h-2 rounded-full terra-shimmer w-1/2" />
        </div>
      </div>
    </div>
  );
}
