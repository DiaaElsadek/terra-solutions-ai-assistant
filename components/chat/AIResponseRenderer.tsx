"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
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
  rowNumber?: number;
  title?: string;
}

interface AIResponseRendererProps {
  response: RichAIResponse;
  onSelectSource?: (item: SourceItemClickPayload) => void;
}

const TONE_BOX_STYLES: Record<SemanticTone, string> = {
  default: "text-ai-bubble-foreground",
  success: "border border-emerald-500/35 bg-emerald-500/10 text-emerald-200",
  warning: "border border-amber-500/35 bg-amber-500/10 text-amber-200",
  danger: "border border-red-500/40 bg-red-500/10 text-red-200",
  info: "border border-sky-500/35 bg-sky-500/10 text-sky-200",
  muted: "border border-border bg-background-secondary/70 text-foreground-muted",
  accent: "border border-primary/40 bg-primary/10 text-terra-gold-light",
};

const TONE_BADGE_STYLES: Record<SemanticTone, string> = {
  default: "bg-background-tertiary border-border text-foreground",
  success: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
  warning: "bg-amber-500/15 border-amber-500/40 text-amber-300",
  danger: "bg-red-500/15 border-red-500/45 text-red-300",
  info: "bg-sky-500/15 border-sky-500/40 text-sky-300",
  muted: "bg-background-secondary border-border text-foreground-muted",
  accent: "bg-primary/15 border-primary/45 text-primary",
};

const TONE_HEADING_TEXT: Record<SemanticTone, string> = {
  default: "text-foreground",
  success: "text-emerald-300",
  warning: "text-amber-300",
  danger: "text-red-300",
  info: "text-sky-300",
  muted: "text-foreground-muted",
  accent: "text-primary",
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

function CopyValueButton({ value }: { value: string }) {
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
      className="inline-flex items-center justify-center rounded p-1 text-foreground-muted/60 hover:text-primary hover:bg-background-tertiary transition-colors"
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

/**
 * Rich, safe React renderer for validated `RichAIResponse` blocks.
 * Never injects HTML/CSS; handles Arabic RTL, English LTR, responsive tables, metrics, and semantic callouts.
 */
export function AIResponseRenderer({
  response,
  onSelectSource,
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
      <p dir={rootDir} className="text-sm leading-relaxed text-ai-bubble-foreground">
        {renderTextWithLucide(sanitizePlainText(response?.answer?.summary || ""))}
      </p>
    );
  }

  return (
    <div
      dir={rootDir}
      className="space-y-3 text-sm leading-relaxed text-ai-bubble-foreground break-words"
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
                    "font-display text-lg font-bold border-b border-border pb-1.5 mt-3 first:mt-0",
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
                    "font-display text-sm font-semibold mt-2.5 first:mt-0",
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
                  "font-display text-base font-bold mt-3 first:mt-0",
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
              return (
                <p key={idx} dir="auto" className="leading-relaxed whitespace-pre-line">
                  {renderTextWithLucide(cleanText)}
                </p>
              );
            }

            return (
              <div
                key={idx}
                dir="auto"
                className={clsx(
                  "rounded-lg px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed flex items-start gap-2 whitespace-pre-line",
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
                  <p className="text-xs font-display font-semibold text-terra-gold-light">
                    {renderTextWithLucide(sanitizePlainText(block.title))}
                  </p>
                )}
                <ListTag
                  className={clsx(
                    "ps-5 space-y-1 text-xs sm:text-sm",
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
            if (cols.length === 0 || rows.length === 0) return null;

            return (
              <div key={idx} className="my-2 space-y-1.5">
                {block.title && (
                  <p dir="auto" className="text-xs font-display font-semibold text-primary">
                    {renderTextWithLucide(sanitizePlainText(block.title))}
                  </p>
                )}
                <div className="overflow-x-auto rounded-xl border border-border bg-background-secondary/40">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-background-secondary text-primary border-b border-border">
                      <tr>
                        {cols.map((col) => (
                          <th
                            key={col.key}
                            dir="auto"
                            className={clsx(
                              "px-3 py-2.5 font-display font-semibold whitespace-nowrap",
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
                    <tbody>
                      {rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-background-tertiary/40 transition-colors">
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
                                  "px-3 py-2 border-t border-border/60 align-top",
                                  isMissing
                                    ? "text-foreground-muted/50"
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
                                    <CopyValueButton value={cellVal} />
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
                  "rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3",
                  TONE_BOX_STYLES[tone]
                )}
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-medium opacity-85">{label}</div>
                  {block.calculationNote && (
                    <div className="text-[10px] opacity-75 mt-0.5">
                      {sanitizePlainText(block.calculationNote)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="font-display text-base font-bold tabular-nums">
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
                  "rounded-xl px-3.5 py-2.5 text-xs flex items-start gap-2.5",
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
                className="rounded-lg border-s-4 border-primary bg-background-secondary/70 px-3.5 py-2.5 text-xs text-terra-gold-pale flex items-start gap-2"
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
            return <hr key={idx} className="border-border/70 my-2" />;

          case "source_list": {
            const items = Array.isArray(block.items) ? block.items : [];
            if (items.length === 0) return null;
            return (
              <div
                key={idx}
                dir="auto"
                className="rounded-xl border border-border/70 bg-background-secondary/50 p-3 space-y-2"
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground-muted">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  <span>{sanitizePlainText(block.title) || "Verified Sources"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((item, sIdx) => (
                    <button
                      key={`${item.fileName}-${item.rowNumber ?? sIdx}-${sIdx}`}
                      type="button"
                      onClick={() => onSelectSource?.(item)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background-tertiary hover:border-primary/60 px-2 py-0.5 text-[11px] text-terra-gold-pale transition-colors cursor-pointer"
                    >
                      <span className="truncate max-w-[180px]">
                        {sanitizePlainText(item.title || item.fileName)}
                      </span>
                      {item.sheetName && (
                        <span className="text-[10px] text-foreground-muted">
                          · {sanitizePlainText(item.sheetName)}
                        </span>
                      )}
                      {item.rowNumber !== undefined && item.rowNumber > 0 && (
                        <span className="text-[10px] text-primary">
                          R{item.rowNumber}
                        </span>
                      )}
                    </button>
                  ))}
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

