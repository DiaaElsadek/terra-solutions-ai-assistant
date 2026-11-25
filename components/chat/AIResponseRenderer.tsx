"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Eye, FileSpreadsheet, Quote } from "lucide-react";
import { clsx } from "clsx";
import { buildGoogleSheetCellLink } from "@/lib/knowledge/source-links";
import {
  ALLOWED_BLOCK_TYPES,
  normalizeTone,
  sanitizePlainText,
  sanitizeRichText,
  type RichAIResponse,
  type RichResponseBlock,
  type SemanticTone,
} from "@/lib/ai/response-schema";
import { BidiText, renderTextWithLucide } from "@/components/ui/RichText";
import {
  detectTextDirection,
  dirAlignClass,
  splitBilingualLines,
} from "@/lib/i18n/bidi";
import {
  TONE_BADGE_STYLES,
  TONE_BOX_STYLES,
  TONE_HEADING_TEXT,
  ToneIcon,
} from "./response/tone-styles";
import { ResponseTable, type TableColumnSpec } from "./response/ResponseTable";
import { ResponseMetricGroup, type MetricItem } from "./response/ResponseMetric";
import { InformationCard } from "./response/InformationCard";

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
  | { kind: "metrics"; items: MetricItem[]; key: number }
  | { kind: "badges"; items: Array<{ label: string; tone: SemanticTone }>; key: number };

function isAttributeKeyValueTable(
  cols: TableColumnSpec[],
  rows: Array<Record<string, unknown>>,
  title?: string
): boolean {
  if (cols.length !== 2 || rows.length === 0 || rows.length > 10) return false;
  if (title && /comparison|مقارنة/i.test(title)) return false;
  const firstKey = cols[0]?.key?.toLowerCase();
  const firstLabel = cols[0]?.label?.toLowerCase() || "";
  return (
    firstKey === "field" ||
    /^(?:attribute|property|البيان|البند|المعلومة)$/i.test(firstLabel.trim())
  );
}

/** Combine consecutive `metric` or `badge` blocks cleanly while preserving exact document order. */
function groupBlocksForDisplay(blocks: RichResponseBlock[]): RenderGroup[] {
  const groups: RenderGroup[] = [];
  let pendingMetrics: MetricItem[] = [];
  let metricStartKey = 0;
  let pendingBadges: Array<{ label: string; tone: SemanticTone }> = [];
  let badgeStartKey = 0;

  const flushMetrics = () => {
    if (pendingMetrics.length > 0) {
      groups.push({ kind: "metrics", items: pendingMetrics, key: metricStartKey });
      pendingMetrics = [];
    }
  };

  const flushBadges = () => {
    if (pendingBadges.length > 0) {
      groups.push({ kind: "badges", items: pendingBadges, key: badgeStartKey });
      pendingBadges = [];
    }
  };

  blocks.forEach((block, idx) => {
    if (!block || typeof block !== "object" || !ALLOWED_BLOCK_TYPES.has(block.type)) {
      return;
    }
    if (block.type === "metric") {
      flushBadges();
      if (pendingMetrics.length === 0) metricStartKey = idx;
      pendingMetrics.push({
        label: block.label,
        value: block.value,
        tone: block.tone,
        calculationNote: block.calculationNote,
      });
      return;
    }
    if (block.type === "badge") {
      flushMetrics();
      const label = sanitizePlainText(block.label);
      if (!label) return;
      if (pendingBadges.length === 0) badgeStartKey = idx;
      pendingBadges.push({ label, tone: normalizeTone(block.tone, "accent") });
      return;
    }
    flushMetrics();
    flushBadges();
    groups.push({ kind: "block", block, key: idx });
  });

  flushMetrics();
  flushBadges();
  return groups;
}

/**
 * Unified, XSS-safe editorial renderer for `RichAIResponse` documents.
 * Supports bilingual Arabic RTL / English LTR typography, safe inline semantic tokens,
 * scannable key-value service cards, comparison tables, KPI metrics, and expandable sections.
 */
export function AIResponseRenderer({
  response,
  onSelectSource,
  hideInlineSources = false,
}: AIResponseRendererProps) {
  const [expandedLong, setExpandedLong] = useState(false);

  const rootDir =
    response.language === "ar"
      ? "rtl"
      : response.language === "en"
      ? "ltr"
      : "auto";

  const rootFallbackDir = response.language === "ar" ? "rtl" : "ltr";

  const blocks = Array.isArray(response?.answer?.blocks)
    ? response.answer.blocks
    : [];

  if (blocks.length === 0) {
    const summaryText = sanitizeRichText(response?.answer?.summary || "");
    return (
      <div
        dir={rootDir}
        className="space-y-1.5 text-[14.5px] sm:text-[15px] leading-[1.72] text-ai-bubble-foreground"
      >
        <BidiText text={summaryText} fallbackDir={rootFallbackDir} />
      </div>
    );
  }

  const grouped = groupBlocksForDisplay(blocks);
  const contentGroups = grouped.filter(
    (g) => g.kind !== "block" || (g.block.type !== "divider" && g.block.type !== "source_list")
  );
  const sourceGroups = grouped.filter(
    (g) => g.kind === "block" && g.block.type === "source_list"
  );
  const canCollapseLong = contentGroups.length > 12;
  const visibleGroups = canCollapseLong && !expandedLong
    ? [...contentGroups.slice(0, 8), ...sourceGroups]
    : grouped;

  return (
    <div
      dir={rootDir}
      className="space-y-3.5 text-[14.5px] sm:text-[15px] leading-[1.72] text-ai-bubble-foreground break-words"
    >
      {visibleGroups.map((entry) => {
        if (entry.kind === "metrics") {
          return (
            <ResponseMetricGroup
              key={`m-${entry.key}`}
              items={entry.items}
              fallbackDir={rootFallbackDir}
            />
          );
        }

        if (entry.kind === "badges") {
          return (
            <div key={`b-${entry.key}`} className="flex flex-wrap items-center gap-1.5">
              {entry.items.map((b, bIdx) => (
                <span
                  key={`${b.label}-${bIdx}`}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    TONE_BADGE_STYLES[b.tone]
                  )}
                >
                  <ToneIcon tone={b.tone} />
                  <span>{b.label}</span>
                </span>
              ))}
            </div>
          );
        }

        const { block, key: idx } = entry;

        switch (block.type) {
          case "heading": {
            const tone = normalizeTone(block.tone, "accent");
            const rawHeading = sanitizePlainText(block.text);
            const headingDir = detectTextDirection(rawHeading, rootFallbackDir);
            const text = renderTextWithLucide(rawHeading, headingDir);
            if (block.level === 1) {
              return (
                <h1
                  key={idx}
                  dir={headingDir}
                  className={clsx(
                    "font-display text-lg font-bold border-b border-border/70 pb-1.5 mt-4 first:mt-0 tracking-tight",
                    dirAlignClass(headingDir),
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
                  dir={headingDir}
                  className={clsx(
                    "font-display text-sm font-semibold mt-3 first:mt-0",
                    dirAlignClass(headingDir),
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
                dir={headingDir}
                className={clsx(
                  "font-display text-[15px] sm:text-base font-bold mt-4 first:mt-0 tracking-tight",
                  dirAlignClass(headingDir),
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
              const renderBidiLines = (txt: string, keyBase: string) => {
                const lines = splitBilingualLines(txt, rootFallbackDir);
                if (lines.length <= 1) {
                  const lineDir = lines[0]?.dir ?? detectTextDirection(txt, rootFallbackDir);
                  return (
                    <p
                      key={keyBase}
                      dir={lineDir}
                      className={clsx("leading-[1.72]", dirAlignClass(lineDir))}
                    >
                      {renderTextWithLucide(lines[0]?.text ?? txt, lineDir)}
                    </p>
                  );
                }
                return (
                  <div key={keyBase} className="space-y-1.5">
                    {lines.map((line, lIdx) => (
                      <p
                        key={`${keyBase}-l-${lIdx}`}
                        dir={line.dir}
                        className={clsx("leading-[1.72]", dirAlignClass(line.dir))}
                      >
                        {renderTextWithLucide(line.text, line.dir)}
                      </p>
                    ))}
                  </div>
                );
              };

              if (segments.length === 1 && segments[0].kind === "text") {
                return renderBidiLines(cleanText, String(idx));
              }
              return (
                <div key={idx} className="space-y-3">
                  {segments.map((seg, sIdx) =>
                    seg.kind === "table" ? (
                      <ResponseTable
                        key={`p-${idx}-t-${sIdx}`}
                        cols={seg.columns}
                        rows={seg.rows}
                        fallbackDir={rootFallbackDir}
                      />
                    ) : (
                      renderBidiLines(seg.text, `p-${idx}-p-${sIdx}`)
                    )
                  )}
                </div>
              );
            }

            const boxDir = detectTextDirection(cleanText, rootFallbackDir);
            return (
              <div
                key={idx}
                dir={boxDir}
                className={clsx(
                  "rounded-xl px-3.5 py-2.5 text-xs sm:text-[13.5px] leading-relaxed flex items-start gap-2.5",
                  dirAlignClass(boxDir),
                  TONE_BOX_STYLES[tone]
                )}
              >
                <ToneIcon tone={tone} />
                <div className="flex-1 min-w-0 space-y-1">
                  <BidiText text={cleanText} fallbackDir={boxDir} />
                </div>
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
            const listTitle = block.title ? sanitizePlainText(block.title) : "";
            const listDir = detectTextDirection(
              [listTitle, ...items].join(" "),
              rootFallbackDir
            );
            const titleDir = listTitle ? detectTextDirection(listTitle, listDir) : listDir;

            return (
              <div
                key={idx}
                dir={listDir}
                className={clsx(
                  "space-y-2",
                  tone !== "default" && "rounded-xl p-3.5",
                  tone !== "default" && TONE_BOX_STYLES[tone]
                )}
              >
                {listTitle && (
                  <p
                    dir={titleDir}
                    className={clsx(
                      "text-xs font-display font-semibold text-terra-gold-pale tracking-wide",
                      dirAlignClass(titleDir)
                    )}
                  >
                    {renderTextWithLucide(listTitle, titleDir)}
                  </p>
                )}
                <ListTag
                  dir={listDir}
                  className={clsx(
                    "ps-5 space-y-1.5 text-[14px] sm:text-[14.5px] marker:text-primary/80",
                    block.style === "numbered" ? "list-decimal" : "list-disc"
                  )}
                >
                  {items.map((item, i) => {
                    const itemLines = splitBilingualLines(item, listDir);
                    const itemDir = itemLines[0]?.dir ?? detectTextDirection(item, listDir);
                    return (
                      <li
                        key={i}
                        dir={itemDir}
                        className={clsx("leading-[1.68]", dirAlignClass(itemDir))}
                      >
                        {itemLines.length > 1 ? (
                          <BidiText text={item} fallbackDir={itemDir} />
                        ) : (
                          renderTextWithLucide(item, itemDir)
                        )}
                      </li>
                    );
                  })}
                </ListTag>
              </div>
            );
          }

          case "table": {
            const cols = Array.isArray(block.columns) ? block.columns : [];
            const rows = Array.isArray(block.rows) ? block.rows : [];
            if (isAttributeKeyValueTable(cols, rows, block.title)) {
              const key0 = cols[0].key;
              const key1 = cols[1].key;
              return (
                <InformationCard
                  key={idx}
                  title={block.title}
                  fallbackDir={rootFallbackDir}
                  rows={rows.map((r) => ({
                    field: String(r?.[key0] ?? ""),
                    value: String(r?.[key1] ?? "—"),
                  }))}
                />
              );
            }
            return (
              <ResponseTable
                key={idx}
                cols={cols}
                rows={rows}
                title={block.title}
                fallbackDir={rootFallbackDir}
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
                dir={detectTextDirection(label, rootFallbackDir)}
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
            const titleText = block.title ? sanitizePlainText(block.title) : "";
            const calloutDir = detectTextDirection(`${titleText} ${text}`, rootFallbackDir);
            const titleDir = titleText ? detectTextDirection(titleText, calloutDir) : calloutDir;
            return (
              <div
                key={idx}
                dir={calloutDir}
                className={clsx(
                  "rounded-xl px-4 py-3 text-xs sm:text-[13.5px] flex items-start gap-2.5",
                  dirAlignClass(calloutDir),
                  TONE_BOX_STYLES[tone]
                )}
              >
                <ToneIcon tone={tone} />
                <div className="flex-1 min-w-0 space-y-1">
                  {titleText && (
                    <p
                      dir={titleDir}
                      className={clsx(
                        "font-display font-semibold text-xs tracking-wide",
                        dirAlignClass(titleDir)
                      )}
                    >
                      {titleText}
                    </p>
                  )}
                  <div className="space-y-1">
                    <BidiText
                      text={text}
                      fallbackDir={calloutDir}
                      lineClassName="leading-[1.68]"
                    />
                  </div>
                </div>
              </div>
            );
          }

          case "quote": {
            const text = sanitizeRichText(block.text);
            if (!text) return null;
            const quoteDir = detectTextDirection(text, rootFallbackDir);
            const citationText = block.citation ? sanitizePlainText(block.citation) : "";
            const citeDir = citationText ? detectTextDirection(citationText, quoteDir) : quoteDir;
            return (
              <blockquote
                key={idx}
                dir={quoteDir}
                className={clsx(
                  "rounded-xl border-s-2 border-primary bg-background-secondary/65 px-4 py-3 text-xs sm:text-[13px] text-terra-gold-pale flex items-start gap-2.5",
                  dirAlignClass(quoteDir)
                )}
              >
                <Quote className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <BidiText
                    text={text}
                    fallbackDir={quoteDir}
                    lineClassName="leading-relaxed"
                  />
                  {citationText && (
                    <footer
                      dir={citeDir}
                      className={clsx("text-[10.5px] text-foreground-muted", dirAlignClass(citeDir))}
                    >
                      {citationText}
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
                        {freshUrl ? (
                          <a
                            href={freshUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Move to ${item.sheetName || "sheet"} ${coordLabel || "row"} in Google Sheets`}
                            aria-label={`Open ${item.title || item.fileName} (${coordLabel || "row"}) in Google Sheets`}
                            className="inline-flex min-w-0 flex-1 items-center gap-1 px-2 py-0.5 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors"
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
                            <ExternalLink className="h-3 w-3 text-primary/80 shrink-0" />
                          </a>
                        ) : (
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

      {canCollapseLong && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setExpandedLong((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background-secondary/75 px-3 py-1.5 text-xs font-medium text-primary hover:border-primary/50 hover:bg-background-tertiary transition-colors cursor-pointer"
          >
            {expandedLong ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>
                  {rootDir === "rtl" ? "طي التفاصيل الإضافية" : "Collapse additional sections"}
                </span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>
                  {rootDir === "rtl"
                    ? `عرض باقي التفاصيل (${grouped.length - visibleGroups.length})`
                    : `Show ${grouped.length - visibleGroups.length} more section${grouped.length - visibleGroups.length > 1 ? "s" : ""}`}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
