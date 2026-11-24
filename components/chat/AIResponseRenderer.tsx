"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Info,
  ShieldAlert,
  Sparkles,
  Quote,
} from "lucide-react";
import { clsx } from "clsx";
import {
  ALLOWED_BLOCK_TYPES,
  normalizeTone,
  sanitizePlainText,
  type RichAIResponse,
  type RichResponseBlock,
  type SemanticTone,
} from "@/lib/ai/response-schema";
import { renderTextWithLucide } from "@/components/ui/RichText";

export interface SourceItemClickPayload {
  recordId?: string;
  sourceId?: string;
  fileName: string;
  sheetName?: string;
  rawSheet?: string;
  rowNumber?: number;
  cell?: string;
  cellRange?: string;
  sourceUrl?: string;
  hasSheetGid?: boolean;
  title?: string;
}

interface AIResponseRendererProps {
  response: RichAIResponse;
  onSelectSource?: (item: SourceItemClickPayload) => void;
  /** Suppress inline source_list blocks when MessageBubble displays a unified collapsible Sources bar. */
  hideInlineSources?: boolean;
}

const TONE_BOX_STYLES: Record<SemanticTone, string> = {
  default: "text-ai-bubble-foreground",
  success: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  warning: "border border-amber-500/30 bg-amber-500/10 text-amber-100",
  danger: "border border-red-500/35 bg-red-500/[0.09] text-red-100",
  info: "border border-sky-500/30 bg-sky-500/[0.08] text-sky-100",
  muted: "border border-border/70 bg-background-secondary/60 text-foreground-muted",
  accent: "border border-primary/35 bg-primary/[0.08] text-terra-gold-light",
};

const TONE_BADGE_STYLES: Record<SemanticTone, string> = {
  default: "bg-background-tertiary border-border text-foreground-muted",
  success: "bg-emerald-500/12 border-emerald-500/35 text-emerald-300",
  warning: "bg-amber-500/12 border-amber-500/35 text-amber-300",
  danger: "bg-red-500/12 border-red-500/40 text-red-300",
  info: "bg-sky-500/12 border-sky-500/35 text-sky-300",
  muted: "bg-background-secondary border-border text-foreground-muted",
  accent: "bg-primary/12 border-primary/40 text-primary",
};

const TONE_HEADING_TEXT: Record<SemanticTone, string> = {
  default: "text-foreground",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-red-300",
  info: "text-sky-300",
  muted: "text-foreground-muted",
  accent: "text-terra-gold-light",
};

function ToneIcon({ tone }: { tone: SemanticTone }) {
  switch (tone) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />;
    case "danger":
      return <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />;
    case "accent":
      return <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />;
    case "info":
    case "muted":
    default:
      return <Info className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />;
  }
}

function CopyValueButton({
  value,
  revealOnHover = false,
}: {
  value: string;
  revealOnHover?: boolean;
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
      title="Copy value"
      aria-label={`Copy ${value}`}
      className={clsx(
        "inline-flex items-center justify-center rounded p-1 text-foreground-muted/70 hover:text-primary hover:bg-background-tertiary transition-all duration-150",
        revealOnHover && !copied && "opacity-75 sm:opacity-0 sm:group-hover/cell:opacity-100 focus-visible:opacity-100"
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

function shouldOfferCellCopy(val: string): boolean {
  if (!val || val === "—") return false;
  return /\d/.test(val) && val.length <= 45;
}

interface TableColumnSpec {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
}

function renderDataTable(
  keyPrefix: string,
  cols: TableColumnSpec[],
  rows: Array<Record<string, unknown>>,
  title?: string
) {
  if (cols.length === 0 || rows.length === 0) return null;
  return (
    <div key={keyPrefix} className="my-2.5 space-y-1.5">
      {title && (
        <p dir="auto" className="text-xs font-display font-semibold text-primary">
          {renderTextWithLucide(sanitizePlainText(title))}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-background-secondary/75">
        <table className="w-full text-[13px] border-collapse">
          <thead className="bg-background-tertiary/75 text-terra-gold-pale border-b border-border/80">
            <tr>
              {cols.map((col) => (
                <th
                  key={col.key}
                  dir="auto"
                  className={clsx(
                    "px-3.5 py-2.5 text-[11px] font-display font-semibold uppercase tracking-wider whitespace-nowrap",
                    col.align === "center"
                      ? "text-center"
                      : col.align === "end"
                      ? "text-end"
                      : "text-start"
                  )}
                >
                  {renderTextWithLucide(sanitizePlainText(col.label))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/45">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-background-tertiary/45 transition-colors duration-100"
              >
                {cols.map((col) => {
                  const rawCell = row?.[col.key];
                  const cellVal =
                    rawCell === undefined || rawCell === null || rawCell === ""
                      ? "—"
                      : sanitizePlainText(String(rawCell)) || "—";
                  const isMissing = cellVal === "—";
                  return (
                    <td
                      key={col.key}
                      dir="auto"
                      className={clsx(
                        "group/cell px-3.5 py-2.5 align-top leading-snug",
                        isMissing
                          ? "text-foreground-muted/45"
                          : "text-terra-gold-light",
                        col.align === "center"
                          ? "text-center"
                          : col.align === "end"
                          ? "text-end font-mono tabular-nums"
                          : "text-start"
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        <span>{renderTextWithLucide(cellVal)}</span>
                        {shouldOfferCellCopy(cellVal) && (
                          <CopyValueButton value={cellVal} revealOnHover />
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ParagraphSegment =
  | { kind: "text"; text: string }
  | {
      kind: "table";
      columns: TableColumnSpec[];
      rows: Array<Record<string, string>>;
    };

function splitPipeRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

const PIPE_SEPARATOR_REGEX = /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*(:?-{2,}:?\s*)?$/;

function splitParagraphAndTables(text: string): ParagraphSegment[] {
  const lines = text.split(/\r?\n/);
  const segments: ParagraphSegment[] = [];
  let textBuf: string[] = [];

  const flushText = () => {
    const joined = textBuf.join("\n").trim();
    if (joined) segments.push({ kind: "text", text: joined });
    textBuf = [];
  };

  let i = 0;
  while (i < lines.length) {
    const cur = lines[i];
    const next = lines[i + 1];
    if (
      cur &&
      next &&
      cur.includes("|") &&
      PIPE_SEPARATOR_REGEX.test(next)
    ) {
      const headers = splitPipeRow(cur).filter(Boolean);
      if (headers.length >= 2) {
        flushText();
        const columns: TableColumnSpec[] = headers.map((label, cIdx) => ({
          key: `col_${cIdx}`,
          label,
        }));
        const rows: Array<Record<string, string>> = [];
        i += 2;
        while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
          const cells = splitPipeRow(lines[i]);
          const rowObj: Record<string, string> = {};
          columns.forEach((col, cIdx) => {
            rowObj[col.key] = cells[cIdx] ?? "";
          });
          rows.push(rowObj);
          i++;
        }
        if (rows.length > 0) {
          segments.push({ kind: "table", columns, rows });
        }
        continue;
      }
    }
    textBuf.push(cur);
    i++;
  }

  flushText();
  return segments;
}

/**
 * Rich, safe editorial renderer for validated `RichAIResponse` blocks.
 * Never injects raw HTML/CSS; enforces Arabic RTL / English LTR typography,
 * hairline tables, restrained metric pills, and semantic callouts.
 */
export function AIResponseRenderer({
  response,
  onSelectSource,
  hideInlineSources = false,
}: AIResponseRendererProps) {
  const rootDir =
    response.language === "ar"
      ? "rtl"
      : response.language === "en"
      ? "ltr"
      : "auto";

  const blocks = Array.isArray(response?.answer?.blocks)
    ? response.answer.blocks
    : [];

  if (blocks.length === 0) {
    return (
      <p dir={rootDir} className="text-[14.5px] leading-relaxed text-ai-bubble-foreground">
        {renderTextWithLucide(sanitizePlainText(response?.answer?.summary || ""))}
      </p>
    );
  }

  return (
    <div
      dir={rootDir}
      className="space-y-3.5 text-[14.5px] leading-[1.68] text-ai-bubble-foreground break-words"
    >
      {blocks.map((block: RichResponseBlock, idx: number) => {
        if (!block || typeof block !== "object" || !ALLOWED_BLOCK_TYPES.has(block.type)) {
          return null;
        }

        switch (block.type) {
          case "heading": {
            const tone = normalizeTone(block.tone, "accent");
            const text = renderTextWithLucide(sanitizePlainText(block.text));
            if (block.level === 1) {
              return (
                <h1
                  key={idx}
                  dir="auto"
                  className={clsx(
                    "font-display text-lg font-bold border-b border-border/70 pb-1.5 mt-4 first:mt-0 tracking-tight",
                    TONE_HEADING_TEXT[tone]
                  )}
                >
                  {text}
                </h1>
              );
            }
            if (block.level === 3) {
              return (
                <h3
                  key={idx}
                  dir="auto"
                  className={clsx(
                    "font-display text-sm font-semibold mt-3 first:mt-0",
                    TONE_HEADING_TEXT[tone]
                  )}
                >
                  {text}
                </h3>
              );
            }
            return (
              <h2
                key={idx}
                dir="auto"
                className={clsx(
                  "font-display text-[15px] font-bold mt-4 first:mt-0 tracking-tight flex items-center gap-2",
                  TONE_HEADING_TEXT[tone]
                )}
              >
                {text}
              </h2>
            );
          }

          case "paragraph": {
            const tone = normalizeTone(block.tone, "default");
            const cleanText = sanitizePlainText(block.text);
            if (!cleanText) return null;

            if (tone === "default") {
              const segments = splitParagraphAndTables(cleanText);
              if (segments.length === 1 && segments[0].kind === "text") {
                return (
                  <p key={idx} dir="auto" className="leading-[1.68] whitespace-pre-line">
                    {renderTextWithLucide(cleanText)}
                  </p>
                );
              }
              return (
                <div key={idx} className="space-y-3">
                  {segments.map((seg, sIdx) =>
                    seg.kind === "table" ? (
                      renderDataTable(`p-${idx}-t-${sIdx}`, seg.columns, seg.rows)
                    ) : (
                      <p
                        key={`p-${idx}-p-${sIdx}`}
                        dir="auto"
                        className="leading-[1.68] whitespace-pre-line"
                      >
                        {renderTextWithLucide(seg.text)}
                      </p>
                    )
                  )}
                </div>
              );
            }

            return (
              <div
                key={idx}
                dir="auto"
                className={clsx(
                  "rounded-lg px-3.5 py-2.5 text-xs sm:text-[13.5px] leading-relaxed flex items-start gap-2.5 whitespace-pre-line",
                  TONE_BOX_STYLES[tone]
                )}
              >
                <ToneIcon tone={tone} />
                <div className="flex-1 min-w-0">{renderTextWithLucide(cleanText)}</div>
              </div>
            );
          }

          case "list": {
            const items = Array.isArray(block.items)
              ? block.items.map(sanitizePlainText).filter(Boolean)
              : [];
            if (items.length === 0) return null;
            const tone = normalizeTone(block.tone, "default");
            const ListTag = block.style === "numbered" ? "ol" : "ul";
            return (
              <div
                key={idx}
                dir="auto"
                className={clsx(
                  "space-y-1.5",
                  tone !== "default" && "rounded-lg p-3",
                  tone !== "default" && TONE_BOX_STYLES[tone]
                )}
              >
                {block.title && (
                  <p className="text-xs font-display font-semibold text-terra-gold-pale tracking-wide">
                    {renderTextWithLucide(sanitizePlainText(block.title))}
                  </p>
                )}
                <ListTag
                  className={clsx(
                    "ps-5 space-y-1.5 text-[13.5px] sm:text-sm marker:text-primary/80",
                    block.style === "numbered" ? "list-decimal" : "list-disc"
                  )}
                >
                  {items.map((item, i) => (
                    <li key={i} dir="auto" className="leading-relaxed">
                      {renderTextWithLucide(item)}
                    </li>
                  ))}
                </ListTag>
              </div>
            );
          }

          case "table": {
            const cols = Array.isArray(block.columns) ? block.columns : [];
            const rows = Array.isArray(block.rows) ? block.rows : [];
            return renderDataTable(String(idx), cols, rows, block.title);
          }

          case "metric": {
            const tone = normalizeTone(block.tone, "info");
            const label = sanitizePlainText(block.label);
            const value = sanitizePlainText(block.value);
            if (!label || !value) return null;

            return (
              <div
                key={idx}
                dir="auto"
                className={clsx(
                  "rounded-lg px-3.5 py-2 flex items-center justify-between gap-3 max-w-md",
                  TONE_BOX_STYLES[tone]
                )}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium opacity-90">{label}</div>
                  {block.calculationNote && (
                    <div className="text-[11px] opacity-75 mt-0.5">
                      {sanitizePlainText(block.calculationNote)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-display text-sm sm:text-base font-bold font-mono tabular-nums">
                    {value}
                  </span>
                  <CopyValueButton value={value} />
                </div>
              </div>
            );
          }

          case "badge": {
            const tone = normalizeTone(block.tone, "accent");
            const label = sanitizePlainText(block.label);
            if (!label) return null;
            return (
              <span
                key={idx}
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                  TONE_BADGE_STYLES[tone]
                )}
              >
                <ToneIcon tone={tone} />
                <span>{label}</span>
              </span>
            );
          }

          case "callout": {
            const tone = normalizeTone(block.tone, "warning");
            const text = sanitizePlainText(block.text);
            if (!text) return null;
            return (
              <div
                key={idx}
                dir="auto"
                className={clsx(
                  "rounded-lg px-3.5 py-2.5 text-xs sm:text-[13px] flex items-start gap-2.5",
                  TONE_BOX_STYLES[tone]
                )}
              >
                <ToneIcon tone={tone} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  {block.title && (
                    <p className="font-display font-semibold text-xs">
                      {sanitizePlainText(block.title)}
                    </p>
                  )}
                  <p className="leading-relaxed whitespace-pre-line">
                    {renderTextWithLucide(text)}
                  </p>
                </div>
              </div>
            );
          }

          case "quote": {
            const text = sanitizePlainText(block.text);
            if (!text) return null;
            return (
              <blockquote
                key={idx}
                dir="auto"
                className="rounded-lg border-s-2 border-primary bg-background-secondary/65 px-3.5 py-2.5 text-xs text-terra-gold-pale flex items-start gap-2"
              >
                <Quote className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="leading-relaxed">{renderTextWithLucide(text)}</p>
                  {block.citation && (
                    <footer className="text-[10px] text-foreground-muted">
                      {sanitizePlainText(block.citation)}
                    </footer>
                  )}
                </div>
              </blockquote>
            );
          }

          case "divider":
            return <hr key={idx} className="border-border/60 my-2.5" />;

          case "source_list": {
            if (hideInlineSources) return null;
            const items = Array.isArray(block.items) ? block.items : [];
            if (items.length === 0) return null;
            return (
              <div
                key={idx}
                dir="auto"
                className="rounded-lg border border-border/70 bg-background-secondary/50 p-3 space-y-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  <span>{sanitizePlainText(block.title) || "Approved Sources"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item, sIdx) => {
                    const coordLabel =
                      item.cellRange ||
                      item.cell ||
                      (item.rowNumber !== undefined && item.rowNumber > 0
                        ? `R${item.rowNumber}`
                        : undefined);
                    return (
                      <div
                        key={`${item.fileName}-${item.rowNumber ?? sIdx}-${sIdx}`}
                        className="inline-flex items-center rounded-md border border-border bg-background-tertiary hover:border-primary/60 transition-colors overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectSource?.(item)}
                          title="Inspect spreadsheet row and highlighted cell"
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors cursor-pointer"
                        >
                          <span className="truncate max-w-[170px]">
                            {sanitizePlainText(item.title || item.fileName)}
                          </span>
                          {item.sheetName && (
                            <span className="text-[10px] text-foreground-muted">
                              · {sanitizePlainText(item.sheetName)}
                            </span>
                          )}
                          {coordLabel && (
                            <span className="text-[10px] font-mono text-primary">
                              {coordLabel}
                            </span>
                          )}
                        </button>
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Move to ${coordLabel || "row"} in Google Sheets`}
                            aria-label={`Open ${item.title || item.fileName} (${coordLabel || "row"}) in Google Sheets`}
                            className="inline-flex items-center justify-center px-1.5 py-1 border-s border-border/70 text-primary hover:bg-primary/15 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
