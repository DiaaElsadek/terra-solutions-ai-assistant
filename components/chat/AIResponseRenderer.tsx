"use client";

import { ExternalLink, FileSpreadsheet, Quote } from "lucide-react";
import { clsx } from "clsx";
import { buildGoogleSheetCellLink } from "@/lib/knowledge/source-links";
import {
  ALLOWED_BLOCK_TYPES,
  normalizeTone,
  sanitizePlainText,
  sanitizeRichText,
  type RichAIResponse,
  type RichResponseBlock,
} from "@/lib/ai/response-schema";
import { renderTextWithLucide } from "@/components/ui/RichText";
import {
  TONE_BADGE_STYLES,
  TONE_BOX_STYLES,
  TONE_HEADING_TEXT,
  ToneIcon,
} from "./response/tone-styles";
import { ResponseTable, type TableColumnSpec } from "./response/ResponseTable";
import { ResponseMetricGroup, type MetricItem } from "./response/ResponseMetric";

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
  /** Suppress inline source_list blocks when MessageBubble displays a collapsible Sources tray. */
  hideInlineSources?: boolean;
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
    if (cur && next && cur.includes("|") && PIPE_SEPARATOR_REGEX.test(next)) {
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

type RenderGroup =
  | { kind: "block"; block: RichResponseBlock; key: number }
  | { kind: "metrics"; items: MetricItem[]; key: number };

/** Combine consecutive `metric` blocks into clean summary grids while preserving order. */
function groupBlocksForDisplay(blocks: RichResponseBlock[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  let pendingMetrics: MetricItem[] = [];
  let metricStartKey = 0;

  const flushMetrics = () => {
    if (pendingMetrics.length > 0) {
      groups.push({ kind: "metrics", items: pendingMetrics, key: metricStartKey });
      pendingMetrics = [];
    }
  };

  blocks.forEach((block, idx) => {
    if (!block || typeof block !== "object" || !ALLOWED_BLOCK_TYPES.has(block.type)) {
      return;
    }
    if (block.type === "metric") {
      if (pendingMetrics.length === 0) metricStartKey = idx;
      pendingMetrics.push({
        label: block.label,
        value: block.value,
        tone: block.tone,
        calculationNote: block.calculationNote,
      });
      return;
    }
    flushMetrics();
    groups.push({ kind: "block", block, key: idx });
  });

  flushMetrics();
  return groups;
}

/**
 * Unified, XSS-safe editorial renderer for `RichAIResponse` documents.
 * Supports bilingual Arabic RTL / English LTR typography, safe inline semantic tokens,
 * responsive comparison tables, grouped KPI metrics, callouts, and source links.
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
      <p
        dir={rootDir}
        className="text-[14.5px] sm:text-[15px] leading-[1.72] text-ai-bubble-foreground"
      >
        {renderTextWithLucide(sanitizeRichText(response?.answer?.summary || ""))}
      </p>
    );
  }

  const grouped = groupBlocksForDisplay(blocks);

  return (
    <div
      dir={rootDir}
      className="space-y-3.5 text-[14.5px] sm:text-[15px] leading-[1.72] text-ai-bubble-foreground break-words"
    >
      {grouped.map((entry) => {
        if (entry.kind === "metrics") {
          return <ResponseMetricGroup key={`m-${entry.key}`} items={entry.items} />;
        }

        const { block, key: idx } = entry;

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
                  "font-display text-[15px] sm:text-base font-bold mt-4 first:mt-0 tracking-tight",
                  TONE_HEADING_TEXT[tone]
                )}
              >
                {text}
              </h2>
            );
          }

          case "paragraph": {
            const tone = normalizeTone(block.tone, "default");
            const cleanText = sanitizeRichText(block.text);
            if (!cleanText) return null;

            if (tone === "default") {
              const segments = splitParagraphAndTables(cleanText);
              if (segments.length === 1 && segments[0].kind === "text") {
                return (
                  <p key={idx} dir="auto" className="leading-[1.72] whitespace-pre-line">
                    {renderTextWithLucide(cleanText)}
                  </p>
                );
              }
              return (
                <div key={idx} className="space-y-3">
                  {segments.map((seg, sIdx) =>
                    seg.kind === "table" ? (
                      <ResponseTable
                        key={`p-${idx}-t-${sIdx}`}
                        cols={seg.columns}
                        rows={seg.rows}
                      />
                    ) : (
                      <p
                        key={`p-${idx}-p-${sIdx}`}
                        dir="auto"
                        className="leading-[1.72] whitespace-pre-line"
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
                  "rounded-xl px-3.5 py-2.5 text-xs sm:text-[13.5px] leading-relaxed flex items-start gap-2.5 whitespace-pre-line",
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
              ? block.items.map(sanitizeRichText).filter(Boolean)
              : [];
            if (items.length === 0) return null;
            const tone = normalizeTone(block.tone, "default");
            const ListTag = block.style === "numbered" ? "ol" : "ul";
            return (
              <div
                key={idx}
                dir="auto"
                className={clsx(
                  "space-y-2",
                  tone !== "default" && "rounded-xl p-3.5",
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
                    "ps-5 space-y-1.5 text-[14px] sm:text-[14.5px] marker:text-primary/80",
                    block.style === "numbered" ? "list-decimal" : "list-disc"
                  )}
                >
                  {items.map((item, i) => (
                    <li key={i} dir="auto" className="leading-[1.68]">
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
            return (
              <ResponseTable
                key={idx}
                cols={cols}
                rows={rows}
                title={block.title}
              />
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
            const text = sanitizeRichText(block.text);
            if (!text) return null;
            return (
              <div
                key={idx}
                dir="auto"
                className={clsx(
                  "rounded-xl px-4 py-3 text-xs sm:text-[13.5px] flex items-start gap-2.5",
                  TONE_BOX_STYLES[tone]
                )}
              >
                <ToneIcon tone={tone} />
                <div className="flex-1 min-w-0 space-y-1">
                  {block.title && (
                    <p className="font-display font-semibold text-xs tracking-wide">
                      {sanitizePlainText(block.title)}
                    </p>
                  )}
                  <p className="leading-[1.68] whitespace-pre-line">
                    {renderTextWithLucide(text)}
                  </p>
                </div>
              </div>
            );
          }

          case "quote": {
            const text = sanitizeRichText(block.text);
            if (!text) return null;
            return (
              <blockquote
                key={idx}
                dir="auto"
                className="rounded-xl border-s-2 border-primary bg-background-secondary/65 px-4 py-3 text-xs sm:text-[13px] text-terra-gold-pale flex items-start gap-2.5"
              >
                <Quote className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="leading-relaxed">{renderTextWithLucide(text)}</p>
                  {block.citation && (
                    <footer className="text-[10.5px] text-foreground-muted">
                      {sanitizePlainText(block.citation)}
                    </footer>
                  )}
                </div>
              </blockquote>
            );
          }

          case "divider":
            return <hr key={idx} className="border-border/55 my-3" />;

          case "source_list": {
            if (hideInlineSources) return null;
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
                    const freshUrl =
                      buildGoogleSheetCellLink({
                        file: item.fileName,
                        sheet: item.sheetName,
                        rawSheet: item.rawSheet,
                        row: item.rowNumber,
                        cell: item.cell,
                        cellRange: item.cellRange,
                      }).url || item.sourceUrl;
                    return (
                      <div
                        key={`${item.fileName}-${item.rowNumber ?? sIdx}-${sIdx}`}
                        className="inline-flex max-w-full items-center rounded-lg border border-border bg-background-tertiary hover:border-primary/60 transition-colors overflow-hidden"
                      >
<<<<<<< HEAD
                        <button
                          type="button"
                          onClick={() => onSelectSource?.(item)}
                          title="Inspect spreadsheet row and highlighted cell"
                          className="inline-flex min-w-0 flex-1 items-center gap-1 px-2 py-0.5 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors cursor-pointer"
                        >
                          <span className="truncate max-w-[170px]">
                            {sanitizePlainText(item.title || item.fileName)}
                          </span>
                          {item.sheetName && (
                            <span className="text-[10px] text-foreground-muted truncate max-w-[110px]">
                              · {sanitizePlainText(item.sheetName)}
                            </span>
                          )}
                          {coordLabel && (
                            <span className="shrink-0 text-[10px] font-mono text-primary">
                              {coordLabel}
                            </span>
                          )}
                        </button>
                        {item.sourceUrl && (
=======
                        {freshUrl ? (
>>>>>>> features
                          <a
                            href={freshUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Move to ${item.sheetName || "sheet"} ${coordLabel || "row"} in Google Sheets`}
                            aria-label={`Open ${item.title || item.fileName} (${coordLabel || "row"}) in Google Sheets`}
<<<<<<< HEAD
                            className="shrink-0 inline-flex items-center justify-center px-1.5 py-1 border-s border-border/70 text-primary hover:bg-primary/15 transition-colors"
=======
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors"
>>>>>>> features
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
                            <ExternalLink className="h-3 w-3 text-primary/80 shrink-0" />
                          </a>
                        ) : (
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
                        )}
                        {onSelectSource && (
                          <button
                            type="button"
                            onClick={() => onSelectSource(item)}
                            title="Preview highlighted Excel row inside Terra Assistant"
                            aria-label={`Preview ${item.title || item.fileName} (${coordLabel || "row"})`}
                            className="inline-flex items-center justify-center px-1.5 py-1 border-s border-border/70 text-foreground-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                          </button>
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
