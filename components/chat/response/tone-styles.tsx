import { useState } from "react";
import {
  AlertTriangle,
  BookmarkCheck,
  Check,
  CheckCircle2,
  Copy,
  Info,
  ShieldAlert,
} from "lucide-react";
import { clsx } from "clsx";
import type { SemanticTone } from "@/lib/ai/response-schema";

export const TONE_BOX_STYLES: Record<SemanticTone, string> = {
  default: "text-ai-bubble-foreground",
  success:
    "border border-emerald-500/30 border-s-2 border-s-emerald-400 bg-emerald-500/10 text-emerald-100",
  warning:
    "border border-amber-500/30 border-s-2 border-s-amber-400 bg-amber-500/10 text-amber-100",
  danger:
    "border border-red-500/35 border-s-2 border-s-red-400 bg-red-500/[0.09] text-red-100",
  info:
    "border border-sky-500/30 border-s-2 border-s-sky-400 bg-sky-500/[0.08] text-sky-100",
  muted:
    "border border-border/70 bg-background-secondary/60 text-foreground-muted",
  accent:
    "border border-primary/35 border-s-2 border-s-primary bg-primary/[0.08] text-terra-gold-light",
  important:
    "border border-primary/40 border-s-2 border-s-primary bg-primary/[0.09] text-terra-gold-light",
};

export const TONE_BADGE_STYLES: Record<SemanticTone, string> = {
  default: "bg-background-tertiary border-border text-foreground-muted",
  success: "bg-emerald-500/12 border-emerald-500/35 text-emerald-300",
  warning: "bg-amber-500/12 border-amber-500/35 text-amber-300",
  danger: "bg-red-500/12 border-red-500/40 text-red-300",
  info: "bg-sky-500/12 border-sky-500/35 text-sky-300",
  muted: "bg-background-secondary border-border text-foreground-muted",
  accent: "bg-primary/12 border-primary/40 text-primary",
  important: "bg-primary/15 border-primary/45 text-terra-gold-light",
};

export const TONE_HEADING_TEXT: Record<SemanticTone, string> = {
  default: "text-foreground",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-red-300",
  info: "text-sky-300",
  muted: "text-foreground-muted",
  accent: "text-terra-gold-light",
  important: "text-primary",
};

export function ToneIcon({ tone }: { tone: SemanticTone }) {
  switch (tone) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />;
    case "danger":
      return <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />;
    case "accent":
    case "important":
      return <BookmarkCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />;
    case "info":
    case "muted":
    default:
      return <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />;
  }
}

export function CopyValueButton({
  value,
  revealOnHover = false,
  label = "Copy value",
}: {
  value: string;
  revealOnHover?: boolean;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* Clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={label}
      aria-label={`${label}: ${value}`}
      className={clsx(
        "inline-flex items-center justify-center rounded p-1 text-foreground-muted/70 hover:text-primary hover:bg-background-tertiary transition-all duration-150 cursor-pointer",
        revealOnHover &&
          !copied &&
          "opacity-75 sm:opacity-0 sm:group-hover/cell:opacity-100 focus-visible:opacity-100"
      )}
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

