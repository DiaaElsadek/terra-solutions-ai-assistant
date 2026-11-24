import { Fragment, type ReactNode, Children, isValidElement, cloneElement } from "react";
import {
  CheckCircle2,
  XCircle,
  Check,
  AlertTriangle,
  Sparkles,
  MapPin,
  Clock,
  CircleDot,
  FileSpreadsheet,
  Folder,
  Lightbulb,
} from "lucide-react";
import { sanitizeRichText, type InlineSemanticTag } from "@/lib/ai/response-schema";

const EMOJI_TOKEN_REGEX =
  /(✅|❌|✔️|✔|⚠️|⚠|🔸|🔹|✨|📍|⏳|⏰|📋|📂|💡)/g;

const SEMANTIC_SPAN_STYLES: Record<InlineSemanticTag, string> = {
  important:
    "inline-block rounded-md bg-primary/14 px-1.5 py-px mx-0.5 border border-primary/28 text-terra-gold-light font-medium",
  success:
    "inline-block rounded-md bg-emerald-500/12 px-1.5 py-px mx-0.5 border border-emerald-500/28 text-emerald-300 font-medium",
  warning:
    "inline-block rounded-md bg-amber-500/14 px-1.5 py-px mx-0.5 border border-amber-500/30 text-amber-200 font-medium",
  danger:
    "inline-block rounded-md bg-red-500/14 px-1.5 py-px mx-0.5 border border-red-500/30 text-red-200 font-medium",
  info:
    "inline-block rounded-md bg-sky-500/12 px-1.5 py-px mx-0.5 border border-sky-500/28 text-sky-200 font-medium",
  muted: "text-foreground-muted/80",
};

function renderEmojiAsLucide(token: string, key: string | number): ReactNode {
  const baseClass = "inline-block align-[-0.15em] mx-0.5 shrink-0";

  switch (token) {
    case "✅":
      return (
        <CheckCircle2
          key={key}
          aria-label="Allowed"
          className={`h-3.5 w-3.5 text-emerald-400 ${baseClass}`}
        />
      );
    case "❌":
      return (
        <XCircle
          key={key}
          aria-label="Not allowed"
          className={`h-3.5 w-3.5 text-red-400 ${baseClass}`}
        />
      );
    case "✔":
    case "✔️":
      return (
        <Check
          key={key}
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-primary ${baseClass}`}
        />
      );
    case "⚠":
    case "⚠️":
      return (
        <AlertTriangle
          key={key}
          aria-label="Warning"
          className={`h-3.5 w-3.5 text-amber-400 ${baseClass}`}
        />
      );
    case "🔸":
    case "🔹":
      return (
        <CircleDot
          key={key}
          aria-hidden="true"
          className={`h-3 w-3 text-primary ${baseClass}`}
        />
      );
    case "✨":
      return (
        <Sparkles
          key={key}
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-primary ${baseClass}`}
        />
      );
    case "📍":
      return (
        <MapPin
          key={key}
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-primary ${baseClass}`}
        />
      );
    case "⏳":
    case "⏰":
      return (
        <Clock
          key={key}
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-primary ${baseClass}`}
        />
      );
    case "📋":
      return (
        <FileSpreadsheet
          key={key}
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-primary ${baseClass}`}
        />
      );
    case "📂":
      return (
        <Folder
          key={key}
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-primary ${baseClass}`}
        />
      );
    case "💡":
      return (
        <Lightbulb
          key={key}
          aria-hidden="true"
          className={`h-3.5 w-3.5 text-primary ${baseClass}`}
        />
      );
    default:
      return token;
  }
}

function renderEmojiOnly(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(EMOJI_TOKEN_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (!part) return null;
    if (EMOJI_TOKEN_REGEX.test(part)) {
      EMOJI_TOKEN_REGEX.lastIndex = 0;
      return renderEmojiAsLucide(part, `${keyPrefix}-${idx}`);
    }
    return <Fragment key={`${keyPrefix}-${idx}`}>{part}</Fragment>;
  });
}

function renderBoldAndEmojis(text: string, keyPrefix: string): ReactNode {
  if (!text) return text;
  const boldParts = text.split(/(\*\*[^*\n]+\*\*)/g);
  if (boldParts.length === 1) {
    return renderEmojiOnly(text, `${keyPrefix}-e`);
  }

  return boldParts.map((segment, idx) => {
    if (!segment) return null;
    if (segment.startsWith("**") && segment.endsWith("**") && segment.length > 4) {
      const inner = segment.slice(2, -2);
      return (
        <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-foreground">
          {renderEmojiOnly(inner, `${keyPrefix}-bi-${idx}`)}
        </strong>
      );
    }
    return (
      <Fragment key={`${keyPrefix}-t-${idx}`}>
        {renderEmojiOnly(segment, `${keyPrefix}-ti-${idx}`)}
      </Fragment>
    );
  });
}

const INLINE_SEMANTIC_SPLIT_RE =
  /(<(?:important|warning|success|danger|info|muted)>[\s\S]*?<\/(?:important|warning|success|danger|info|muted)>)/gi;
const INLINE_SEMANTIC_EXACT_RE =
  /^<(important|warning|success|danger|info|muted)>([\s\S]*?)<\/\1>$/i;

/**
 * Safely transforms whitelisted semantic highlight tags (`<important>`, `<warning>`,
 * `<success>`, `<danger>`, `<info>`, `<muted>`), `**bold**` runs, and dataset emojis
 * into controlled React nodes. Unknown/malformed tags degrade cleanly to plain text.
 */
export function renderTextWithLucide(text: string): ReactNode {
  if (!text) return text;
  const safeText = text.includes("<") ? sanitizeRichText(text) : text;
  const parts = safeText.split(INLINE_SEMANTIC_SPLIT_RE);

  if (parts.length === 1) {
    return renderBoldAndEmojis(safeText, "p");
  }

  return parts.map((part, idx) => {
    if (!part) return null;
    const match = part.match(INLINE_SEMANTIC_EXACT_RE);
    if (match) {
      const tag = match[1].toLowerCase() as InlineSemanticTag;
      const inner = match[2];
      return (
        <span key={`sem-${idx}`} className={SEMANTIC_SPAN_STYLES[tag]}>
          {renderBoldAndEmojis(inner, `semi-${idx}`)}
        </span>
      );
    }
    return (
      <Fragment key={`seg-${idx}`}>
        {renderBoldAndEmojis(part, `seg-${idx}`)}
      </Fragment>
    );
  });
}

/** Recursively transform React children so string nodes render Lucide icons and semantic tags. */
export function renderNodesWithLucide(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return renderTextWithLucide(child);
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children) {
      return cloneElement(child, {
        ...child.props,
        children: renderNodesWithLucide(child.props.children),
      });
    }
    return child;
  });
}

/** Renders rich sanitized text cleanly using inline React nodes and Lucide icons. */
export function RichText({ text }: { text: string }) {
  return <>{renderTextWithLucide(text)}</>;
}
