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
import {
  detectTextDirection,
  dirAlignClass,
  splitBilingualLines,
  splitInlineBidiRuns,
  type TextDirection,
} from "@/lib/i18n/bidi";

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

function renderPlainWithBidi(
  text: string,
  keyPrefix: string,
  parentDir: TextDirection
): ReactNode {
  if (parentDir !== "rtl") return text;
  const runs = splitInlineBidiRuns(text, parentDir);
  if (runs.length === 1 && !runs[0].isolateLtr) return text;

  return runs.map((run, rIdx) =>
    run.isolateLtr ? (
      <bdi key={`${keyPrefix}-bdi-${rIdx}`} dir="ltr">
        {run.text}
      </bdi>
    ) : (
      <Fragment key={`${keyPrefix}-txt-${rIdx}`}>{run.text}</Fragment>
    )
  );
}

function renderEmojiOnly(
  text: string,
  keyPrefix: string,
  parentDir: TextDirection = "ltr"
): ReactNode {
  const parts = text.split(EMOJI_TOKEN_REGEX);
  if (parts.length === 1) {
    return renderPlainWithBidi(text, keyPrefix, parentDir);
  }

  return parts.map((part, idx) => {
    if (!part) return null;
    if (EMOJI_TOKEN_REGEX.test(part)) {
      EMOJI_TOKEN_REGEX.lastIndex = 0;
      return renderEmojiAsLucide(part, `${keyPrefix}-${idx}`);
    }
    return (
      <Fragment key={`${keyPrefix}-${idx}`}>
        {renderPlainWithBidi(part, `${keyPrefix}-b-${idx}`, parentDir)}
      </Fragment>
    );
  });
}

function renderBoldAndEmojis(
  text: string,
  keyPrefix: string,
  parentDir: TextDirection = "ltr"
): ReactNode {
  if (!text) return text;
  const boldParts = text.split(/(\*\*[^*\n]+\*\*)/g);
  if (boldParts.length === 1) {
    return renderEmojiOnly(text, `${keyPrefix}-e`, parentDir);
  }

  return boldParts.map((segment, idx) => {
    if (!segment) return null;
    if (segment.startsWith("**") && segment.endsWith("**") && segment.length > 4) {
      const inner = segment.slice(2, -2);
      const innerDir = detectTextDirection(inner, parentDir);
      return (
        <strong
          key={`${keyPrefix}-b-${idx}`}
          dir={innerDir}
          className="font-semibold text-foreground"
        >
          {renderEmojiOnly(inner, `${keyPrefix}-bi-${idx}`, innerDir)}
        </strong>
      );
    }
    return (
      <Fragment key={`${keyPrefix}-t-${idx}`}>
        {renderEmojiOnly(segment, `${keyPrefix}-ti-${idx}`, parentDir)}
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
 * into controlled React nodes with bidirectional isolation for mixed Arabic/English runs.
 */
export function renderTextWithLucide(
  text: string,
  parentDir?: TextDirection
): ReactNode {
  if (!text) return text;
  const safeText = text.includes("<") ? sanitizeRichText(text) : text;
  const resolvedDir = parentDir ?? detectTextDirection(safeText, "ltr");
  const parts = safeText.split(INLINE_SEMANTIC_SPLIT_RE);

  if (parts.length === 1) {
    return renderBoldAndEmojis(safeText, "p", resolvedDir);
  }

  return parts.map((part, idx) => {
    if (!part) return null;
    const match = part.match(INLINE_SEMANTIC_EXACT_RE);
    if (match) {
      const tag = match[1].toLowerCase() as InlineSemanticTag;
      const inner = match[2];
      const innerDir = detectTextDirection(inner, resolvedDir);
      return (
        <span key={`sem-${idx}`} dir={innerDir} className={SEMANTIC_SPAN_STYLES[tag]}>
          {renderBoldAndEmojis(inner, `semi-${idx}`, innerDir)}
        </span>
      );
    }
    return (
      <Fragment key={`seg-${idx}`}>
        {renderBoldAndEmojis(part, `seg-${idx}`, resolvedDir)}
      </Fragment>
    );
  });
}

/** Recursively transform React children so string nodes render Lucide icons, semantic tags, and bidi runs. */
export function renderNodesWithLucide(
  children: ReactNode,
  parentDir: TextDirection = "ltr"
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return renderTextWithLucide(child, parentDir);
    }
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children) {
      return cloneElement(child, {
        ...child.props,
        children: renderNodesWithLucide(child.props.children, parentDir),
      });
    }
    return child;
  });
}

/**
 * Renders multi-line or bilingual strings with explicit per-line direction and alignment
 * (`dir="rtl" text-right` for Arabic lines, `dir="ltr" text-left` for English lines).
 */
export function BidiText({
  text,
  fallbackDir = "ltr",
  lineClassName,
}: {
  text: string;
  fallbackDir?: TextDirection;
  lineClassName?: string;
}) {
  const lines = splitBilingualLines(text, fallbackDir);
  if (lines.length === 0) return null;

  return (
    <>
      {lines.map((line, idx) => (
        <span
          key={idx}
          dir={line.dir}
          className={["block", dirAlignClass(line.dir), lineClassName]
            .filter(Boolean)
            .join(" ")}
        >
          {renderTextWithLucide(line.text, line.dir)}
        </span>
      ))}
    </>
  );
}

/** Renders rich sanitized text cleanly using inline React nodes and Lucide icons. */
export function RichText({ text }: { text: string }) {
  return <>{renderTextWithLucide(text)}</>;
}
