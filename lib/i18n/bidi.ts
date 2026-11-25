export type TextDirection = "rtl" | "ltr";

const ARABIC_CHAR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LATIN_CHAR_RE = /[A-Za-z\u00C0-\u024F]/g;
const ARABIC_WORD_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]{2,}/g;
const LATIN_WORD_RE = /[A-Za-z\u00C0-\u024F]{2,}/g;

const SEMANTIC_OR_HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/g;
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\([^)]+\)/g;
const URL_RE = /https?:\/\/[^\s)]+/gi;
const PARENTHETICAL_RE = /\([^()]{1,120}\)/g;
const LATIN_PREFIX_BEFORE_ARABIC_RE =
  /^\s*[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F\s+.,&/'()-]{1,80}?[:—–-]?\s*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/**
 * Strips markup tags, URLs, and Markdown link targets so script detection
 * measures actual visible prose rather than tag names like `<important>`.
 */
export function stripMarkupForBidi(text: string): string {
  return text
    .replace(SEMANTIC_OR_HTML_TAG_RE, " ")
    .replace(MARKDOWN_LINK_RE, "$1")
    .replace(URL_RE, " ")
    .replace(/[*_`~#>]/g, " ")
    .trim();
}

export function countScriptChars(text: string): {
  arabic: number;
  latin: number;
  arWords: number;
  enWords: number;
} {
  const cleaned = stripMarkupForBidi(text);
  const arabic = (cleaned.match(ARABIC_CHAR_RE) ?? []).length;
  const latin = (cleaned.match(LATIN_CHAR_RE) ?? []).length;
  const arWords = (cleaned.match(ARABIC_WORD_RE) ?? []).length;
  const enWords = (cleaned.match(LATIN_WORD_RE) ?? []).length;
  return { arabic, latin, arWords, enWords };
}

function decideDirectionFromStats(
  cleaned: string,
  stats: { arabic: number; latin: number; arWords: number; enWords: number },
  fallback: TextDirection
): TextDirection {
  const { arabic, latin, arWords } = stats;
  if (arabic === 0 && latin === 0) return fallback;
  if (arabic > 0 && latin === 0) return "rtl";
  if (latin > 0 && arabic === 0) return "ltr";

  // Mixed Arabic + English text:
  // If an English brand/device title precedes an Arabic predicate
  // (e.g., "Candela GentleMax Pro Plus لإزالة الشعر"), render the sentence RTL.
  if (
    arWords >= 2 &&
    LATIN_PREFIX_BEFORE_ARABIC_RE.test(cleaned) &&
    arabic >= latin * 0.45
  ) {
    return "rtl";
  }

  return arabic >= latin ? "rtl" : "ltr";
}

/**
 * Detects whether a block, cell, or line should align RTL (`rtl`) or LTR (`ltr`).
 * Inspects primary prose outside brief parenthetical glosses first so a single
 * `(English)` or `(عربي)` note never flips the surrounding sentence alignment.
 */
export function detectTextDirection(
  text: string,
  fallback: TextDirection = "ltr"
): TextDirection {
  if (!text) return fallback;

  const cleaned = stripMarkupForBidi(text);
  if (!cleaned) return fallback;

  const primaryOnly = cleaned.replace(PARENTHETICAL_RE, " ").replace(/\s+/g, " ").trim();
  const primaryStats = countScriptChars(primaryOnly);
  if (primaryStats.arabic > 0 || primaryStats.latin > 0) {
    return decideDirectionFromStats(primaryOnly, primaryStats, fallback);
  }

  return decideDirectionFromStats(cleaned, countScriptChars(cleaned), fallback);
}

/**
 * Explicit Tailwind alignment utility matching `dir` so Arabic blocks consistently
 * align right (`text-right`) and English blocks consistently align left (`text-left`).
 */
export function dirAlignClass(dir: TextDirection): "text-right" | "text-left" {
  return dir === "rtl" ? "text-right" : "text-left";
}

/**
 * Checks whether two sides of an explicit separator (` / `, ` | `, ` — `) represent
 * distinct Arabic vs English clauses rather than same-language list items like `Face / Neck`.
 */
function areOppositeLanguageClauses(left: string, right: string): boolean {
  const leftDir = detectTextDirection(left);
  const rightDir = detectTextDirection(right);
  if (leftDir === rightDir) return false;

  const l = countScriptChars(left);
  const r = countScriptChars(right);
  const rtlStats = leftDir === "rtl" ? l : r;
  const ltrStats = leftDir === "ltr" ? l : r;

  return rtlStats.arabic >= 10 && ltrStats.latin >= 10 && ltrStats.arabic <= 2;
}

function splitDualLanguageSeparator(line: string): string[] {
  const separatorMatch = line.match(/^(.+?)\s+(?:\/|\||—|–)\s+(.+)$/);
  if (!separatorMatch) return [line];

  const left = separatorMatch[1].trim();
  const right = separatorMatch[2].trim();
  if (left && right && areOppositeLanguageClauses(left, right)) {
    return [left, right];
  }
  return [line];
}

export interface BidiLine {
  text: string;
  dir: TextDirection;
}

/**
 * Splits multi-line strings (and explicit dual-language `Arabic / English` dividers)
 * into individual directional lines so Arabic lines right-align RTL and English
 * lines left-align LTR independently.
 */
export function splitBilingualLines(
  text: string,
  fallback: TextDirection = "ltr"
): BidiLine[] {
  if (!text) return [];

  const rawLines = text.split(/\r?\n/);
  const result: BidiLine[] = [];
  let lastDir: TextDirection = fallback;

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const segments = splitDualLanguageSeparator(trimmed);
    for (const segment of segments) {
      const dir = detectTextDirection(segment, lastDir);
      lastDir = dir;
      result.push({ text: segment, dir });
    }
  }

  if (result.length === 0) {
    const trimmed = text.trim();
    if (trimmed) {
      result.push({ text: trimmed, dir: detectTextDirection(trimmed, fallback) });
    }
  }

  return result;
}

/**
 * Inline bidirectional run matcher for embedded Latin/brand/unit spans
 * (e.g., `Candela GentleMax Pro Plus`, `5000 AED`, `A15:A19`, `10:00 AM - 6:00 PM`)
 * inside Arabic RTL context so punctuation and numbers never scramble visually.
 */
export const INLINE_LTR_RUN_RE =
  /([A-Za-z0-9][A-Za-z0-9\s+./:&%#@()_,-]*[A-Za-z0-9%)]|[A-Za-z]{2,}|\d+(?:[.,:/-]\d+)+|\d+\s*[A-Za-z%]+|[A-Z]\d+(?::[A-Z]\d+)?)/g;

export interface BidiInlinePart {
  text: string;
  isolateLtr: boolean;
}

export function splitInlineBidiRuns(
  text: string,
  parentDir: TextDirection
): BidiInlinePart[] {
  if (parentDir !== "rtl" || !text) {
    return [{ text, isolateLtr: false }];
  }

  const parts: BidiInlinePart[] = [];
  let lastIdx = 0;

  for (const match of text.matchAll(INLINE_LTR_RUN_RE)) {
    const value = match[0];
    const start = match.index ?? 0;

    // Trim trailing spaces so Arabic spacing stays attached outside <bdi>
    const trimmed = value.trim();
    if (!trimmed) continue;

    const leadingWs = value.length - value.trimStart().length;
    const actualStart = start + leadingWs;
    const actualEnd = actualStart + trimmed.length;

    // Only isolate runs that contain at least one Latin letter or structured numeric range/currency
    const hasLatin = /[A-Za-z]/.test(trimmed);
    const hasFormattedRangeOrCurrency =
      /\d+\s*[A-Za-z%]+/.test(trimmed) || /\d+[:/-]\d+/.test(trimmed);

    if (!hasLatin && !hasFormattedRangeOrCurrency) {
      continue;
    }

    if (actualStart > lastIdx) {
      parts.push({ text: text.slice(lastIdx, actualStart), isolateLtr: false });
    }
    parts.push({ text: trimmed, isolateLtr: true });
    lastIdx = actualEnd;
  }

  if (lastIdx < text.length) {
    parts.push({ text: text.slice(lastIdx), isolateLtr: false });
  }

  return parts.length > 0 ? parts : [{ text, isolateLtr: false }];
}
