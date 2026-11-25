import { Avatar } from "@/components/ui/Avatar";
import { BRAND } from "@/constants/brand";

/**
 * Calm, editorial Terra-branded skeleton indicator shown while answers are retrieved
 * and prepared — communicates structure cleanly and honors `prefers-reduced-motion`.
 */
export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Terra Assistant is searching verified company knowledge"
      className="flex items-start gap-3.5 max-w-3xl terra-animate-in"
    >
      <div className="hidden sm:block pt-0.5">
        <Avatar variant="assistant" size="md" />
      </div>

      <div className="flex-1 min-w-0 space-y-3 border-s-2 border-primary/35 ps-3.5 sm:ps-5">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs font-semibold text-foreground tracking-tight">
            {BRAND.assistant.shortName}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
            <span>Searching verified records…</span>
          </span>
        </div>

        <div
          className="rounded-xl border border-border/60 bg-[#120E08] p-3.5 space-y-2.5 max-w-lg"
          aria-hidden="true"
        >
          <div className="h-2.5 rounded-full terra-shimmer w-2/5" />
          <div className="h-2 rounded-full terra-shimmer w-5/6" />
          <div className="h-2 rounded-full terra-shimmer w-3/5" />
        </div>
      </div>
    </div>
  );
}
