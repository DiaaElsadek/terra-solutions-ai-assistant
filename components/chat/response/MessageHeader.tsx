import { HelpCircle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { TerraMark } from "@/components/branding/TerraMark";
import { BRAND } from "@/constants/brand";

const CONFIDENCE_LABELS: Record<
  string,
  { label: string; variant: "success" | "gold" | "warning" | "danger" }
> = {
  strong: { label: "Verified Record", variant: "success" },
  partial: { label: "Partial Match", variant: "warning" },
  ambiguous: { label: "Clarification Needed", variant: "gold" },
  none: { label: "Unavailable in KB", variant: "danger" },
};

interface MessageHeaderProps {
  confidenceLevel?: string;
  requiresClarification?: boolean;
  isFallbackActive?: boolean;
  isStreaming?: boolean;
  formattedTime: string;
  hideBadgeOnPlain?: boolean;
}

/**
 * Clean Terra Assistant message header showing branded attribution, verification status,
 * optional offline-KB fallback indicator (never exposing external model names), and timestamp.
 */
export function MessageHeader({
  confidenceLevel,
  requiresClarification,
  isFallbackActive = false,
  isStreaming = false,
  formattedTime,
  hideBadgeOnPlain = false,
}: MessageHeaderProps) {
  const confMeta =
    !hideBadgeOnPlain && confidenceLevel
      ? CONFIDENCE_LABELS[confidenceLevel]
      : undefined;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <TerraMark size="xs" variant="bare" className="sm:hidden" />
        <span className="font-display text-xs font-semibold text-foreground tracking-tight">
          {BRAND.assistant.shortName}
        </span>

        {confMeta && (
          <Badge variant={confMeta.variant} className="text-[10px] py-0">
            {confMeta.label}
          </Badge>
        )}

        {isFallbackActive && (
          <span
            title="Answered directly from Terra Solutions' approved internal knowledge records."
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background-secondary/80 px-2 py-0.5 text-[10px] font-medium text-foreground-muted"
          >
            <ShieldCheck className="h-2.5 w-2.5 text-primary" />
            <span>Direct KB Match</span>
          </span>
        )}

        {requiresClarification && (
          <Badge variant="gold" className="text-[10px] py-0">
            <HelpCircle className="h-3 w-3" />
            Clarification
          </Badge>
        )}
      </div>

      <span
        suppressHydrationWarning
        className="text-[11px] text-foreground-muted/60 tabular-nums terra-tabular"
      >
        {isStreaming ? "Preparing response…" : formattedTime}
      </span>
    </div>
  );
}
