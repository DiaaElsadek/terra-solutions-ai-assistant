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

const EMOJI_TOKEN_REGEX =
  /(✅|❌|✔️|✔|⚠️|⚠|🔸|🔹|✨|📍|⏳|⏰|📋|📂|💡)/g;

function renderEmojiAsLucide(token: string, key: number): ReactNode {
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

/** Replace any inline emoji symbols in a string with Lucide React icons. */
export function renderTextWithLucide(text: string): ReactNode {
  const parts = text.split(EMOJI_TOKEN_REGEX);
  if (parts.length === 1) return text;

  return parts.map((part, idx) => {
    if (!part) return null;
    if (EMOJI_TOKEN_REGEX.test(part)) {
      EMOJI_TOKEN_REGEX.lastIndex = 0;
      return renderEmojiAsLucide(part, idx);
    }
    return <Fragment key={idx}>{part}</Fragment>;
  });
}

/** Recursively transform React children so string nodes render Lucide icons instead of emojis. */
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

/** Renders a plain text string with inline Lucide icons replacing any dataset emojis. */
export function RichText({ text }: { text: string }) {
  return <>{renderTextWithLucide(text)}</>;
}

