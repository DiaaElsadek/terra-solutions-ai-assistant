import { HelpCircle } from "lucide-react";
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
  isStreaming?: boolean;
  formattedTime: string;
  hideBadgeOnPlain?: boolean;
}

/**
 * Clean Terra Assistant message header showing branded attribution, verification status,
 * and timestamp without exposing upstream model or provider infrastructure.
 */
export function MessageHeader({
  confidenceLevel,
  requiresClarification,
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

        {requiresClarification && (
          <Badge variant="gold" className="text-[10px] py-0">
            <HelpCircle className="h-3 w-3" />
            Clarification
          </Badge>
        )}
      </div>

      <span
        suppressHydrationWarning
        className="text-[11px] text-foreground-muted/60 tabular-nums"
      >
        {isStreaming ? "Preparing response…" : formattedTime}
      </span>
    </div>
  );
}

