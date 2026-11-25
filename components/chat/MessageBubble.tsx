"use client";

import { useState, useRef, useMemo } from "react";
import { AlertTriangle, ExternalLink, RotateCcw } from "lucide-react";
import type { Message, MessageSource } from "@/types";
import { buildGoogleSheetCellLink } from "@/lib/knowledge/source-links";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { stripSemanticTags } from "@/lib/ai/response-schema";
import {
  SheetCellPreview,
  type SheetContextData,
} from "@/components/knowledge/SheetCellPreview";
import { AIResponseRenderer } from "./AIResponseRenderer";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { MessageHeader } from "./response/MessageHeader";
import { MessageActions } from "./response/MessageActions";
import { SourceReferenceTray } from "./response/SourceReferenceTray";

interface MessageBubbleProps {
  message: Message;
  userName?: string;
  isLastAssistant?: boolean;
  onRetry?: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Editorial briefing presentation for Terra Assistant responses and restrained
 * right-aligned bubbles for employee questions. Zero upstream AI branding.
 */
export function MessageBubble({
  message,
  userName,
  isLastAssistant = false,
  onRetry,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MessageSource | null>(null);
  const [sheetContext, setSheetContext] = useState<SheetContextData | null>(null);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const activeFetchIdRef = useRef(0);

  const keyHighlightsText = useMemo(() => {
    const blocks = message.structured?.answer?.blocks;
    if (!Array.isArray(blocks)) return undefined;
    const metrics = blocks.filter((b) => b.type === "metric");
    if (metrics.length === 0) return undefined;
    return metrics.map((m) => `${m.label}: ${m.value}`).join("\n");
  }, [message.structured]);

  const openSourceInspector = async (src: MessageSource) => {
    const freshLink =
      src.type !== "external" ? buildGoogleSheetCellLink(src) : { url: undefined, hasSheetGid: false };
    const enrichedSrc: MessageSource =
      freshLink.url
        ? { ...src, url: freshLink.url, hasSheetGid: freshLink.hasSheetGid }
        : src;
    const reqId = ++activeFetchIdRef.current;
    setSelectedSource(enrichedSrc);
    setSheetContext(null);

    if (enrichedSrc.type === "external" || !enrichedSrc.sheet || !enrichedSrc.row || enrichedSrc.row <= 0) {
      setLoadingSheet(false);
      return;
    }

    setLoadingSheet(true);
    try {
      const params = new URLSearchParams({
        sheet: enrichedSrc.rawSheet || enrichedSrc.sheet,
        row: String(enrichedSrc.row),
      });
      if (enrichedSrc.cell) params.set("cell", enrichedSrc.cell);
      if (enrichedSrc.cellRange) params.set("range", enrichedSrc.cellRange);

      const res = await fetch(`/api/knowledge?${params.toString()}`);
      if (activeFetchIdRef.current !== reqId) return;
      if (res.ok) {
        const data = (await res.json()) as { sheetContext?: SheetContextData };
        setSheetContext(data.sheetContext || null);
      }
    } catch {
      if (activeFetchIdRef.current === reqId) setSheetContext(null);
    } finally {
      if (activeFetchIdRef.current === reqId) setLoadingSheet(false);
    }
  };

  const closeSourceInspector = () => {
    activeFetchIdRef.current++;
    setSelectedSource(null);
    setSheetContext(null);
    setLoadingSheet(false);
  };

  const handleCopy = async () => {
    try {
      const plain = stripSemanticTags(message.content);
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard unavailable */
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3 max-w-3xl ms-auto w-full terra-animate-in">
        <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[74%]">
          <div
            dir="auto"
            className="rounded-2xl rounded-te-sm border border-primary/25 bg-[#231B0E] text-terra-gold-light px-4 py-2.5 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words terra-subtle-shadow"
          >
            {message.content}
          </div>
          <span
            suppressHydrationWarning
            className="text-[11px] text-foreground-muted/55 px-1 tabular-nums"
          >
            {formatTime(message.timestamp)}
          </span>
        </div>
        <Avatar name={userName} variant="user" size="md" />
      </div>
    );
  }

  if (message.status === "error") {
    return (
      <div className="flex items-start gap-3.5 max-w-3xl w-full terra-animate-in">
        <Avatar variant="assistant" size="md" />
        <div className="flex-1 min-w-0 rounded-xl border border-red-500/35 bg-red-500/[0.08] p-4 text-sm text-red-100 space-y-3">
          <div className="flex items-center gap-2 font-display font-semibold text-red-300 text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Unable to complete response</span>
          </div>
          <p dir="auto" className="text-xs text-red-200/85 leading-relaxed">
            {message.errorMessage ||
              "Something went wrong while preparing the response. Please try again. / حصلت مشكلة أثناء تجهيز الإجابة. حاول مرة تانية."}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  const hasCompanySources = Boolean(message.sources && message.sources.length > 0);
  const blocks = message.structured?.answer?.blocks;
  const isSimpleConversational =
    !hasCompanySources &&
    (!blocks || (blocks.length === 1 && blocks[0].type === "paragraph"));

  return (
    <div className="group flex items-start gap-3.5 max-w-3xl w-full terra-animate-in">
      <div className="hidden sm:block pt-0.5">
        <Avatar variant="assistant" size="md" />
      </div>

      <div className="flex-1 min-w-0 space-y-3 border-s-2 border-primary/25 ps-3.5 sm:ps-5">
        <MessageHeader
          confidenceLevel={message.confidenceLevel}
          requiresClarification={message.requiresClarification}
          isStreaming={message.status === "streaming"}
          formattedTime={formatTime(message.timestamp)}
          hideBadgeOnPlain={isSimpleConversational}
        />

        {/* Response Body */}
        <div>
          {message.structured &&
          Array.isArray(message.structured.answer?.blocks) &&
          message.status !== "streaming" ? (
            <AIResponseRenderer
              response={message.structured}
              hideInlineSources={hasCompanySources}
              onSelectSource={(item) => {
                const matched = message.sources?.find(
                  (s) =>
                    (item.sheetName && s.sheet === item.sheetName && s.row === item.rowNumber) ||
                    (item.title && s.title === item.title)
                );
                if (matched) {
                  void openSourceInspector(matched);
                } else {
                  void openSourceInspector({
                    category: "Knowledge Base",
                    title: item.title || item.fileName,
                    type: "knowledge",
                    file: item.fileName,
                    sheet: item.sheetName,
                    rawSheet: item.rawSheet,
                    row: item.rowNumber,
                    rows: item.rowNumber ? [item.rowNumber] : undefined,
                    cell: item.cell,
                    cellRange: item.cellRange,
                    url: item.sourceUrl,
                    hasSheetGid: item.hasSheetGid,
                  });
                }
              }}
            />
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Neutral advisories (source conflicts, unavailability notices) */}
        {message.warnings && message.warnings.length > 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3.5 py-2.5 space-y-1">
            {message.warnings.map((w, idx) => (
              <p
                key={idx}
                dir="auto"
                className="text-[11.5px] text-amber-200/90 flex items-start gap-2 leading-relaxed"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{w}</span>
              </p>
            ))}
          </div>
        )}

        {/* Secondary Collapsible Company & External Sources */}
        <SourceReferenceTray
          sources={message.sources}
          externalSources={message.externalSources}
          onInspectSource={(src) => void openSourceInspector(src)}
        />

<<<<<<< HEAD
        {/* Subtle Utility Actions */}
        <MessageActions
          onCopyResponse={() => void handleCopy()}
          copied={copied}
          keyHighlightsText={keyHighlightsText}
          isLastAssistant={isLastAssistant}
          isStreaming={message.status === "streaming"}
          onRetry={onRetry}
        />
=======
            {sourcesExpanded && (
              <div className="flex flex-wrap items-center gap-1.5">
                {message.sources.map((src, idx) => {
                  const cellBadge =
                    src.cellRange ||
                    src.cell ||
                    (src.row !== undefined && src.row > 0 ? `R${src.row}` : undefined);
                  const freshLink =
                    src.type !== "external"
                      ? buildGoogleSheetCellLink(src)
                      : { url: src.url, hasSheetGid: false };
                  const targetUrl = freshLink.url || src.url;
                  return (
                    <div
                      key={`${src.category}-${src.title}-${idx}`}
                      className="inline-flex max-w-full items-center rounded-md bg-background-secondary border border-border hover:border-primary/60 transition-colors overflow-hidden"
                    >
                      {targetUrl ? (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Open ${src.sheet || src.category} at ${cellBadge || "row"} in Google Sheets`}
                          aria-label={`Open ${src.title} (${cellBadge || "row"}) in Google Sheets`}
                          className="inline-flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors"
                        >
                          <span className="text-primary font-medium truncate max-w-[110px] sm:max-w-[140px]">
                            {src.sheet || src.category}
                          </span>
                          <span className="truncate min-w-0 max-w-[140px] sm:max-w-[170px] text-foreground-muted">
                            {src.title}
                          </span>
                          {cellBadge && (
                            <span className="shrink-0 text-[10px] font-mono text-primary/90">
                              {cellBadge}
                            </span>
                          )}
                          <ExternalLink className="h-3 w-3 shrink-0 text-primary/80" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void openSourceInspector(src)}
                          title="Inspect source record details"
                          className="inline-flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors cursor-pointer"
                        >
                          <span className="text-primary font-medium truncate max-w-[110px] sm:max-w-[140px]">
                            {src.sheet || src.category}
                          </span>
                          <span className="truncate min-w-0 max-w-[140px] sm:max-w-[170px] text-foreground-muted">
                            {src.title}
                          </span>
                          {cellBadge && (
                            <span className="shrink-0 text-[10px] font-mono text-primary/90">
                              {cellBadge}
                            </span>
                          )}
                        </button>
                      )}
                      {src.type !== "external" && src.row !== undefined && src.row > 0 && (
                        <button
                          type="button"
                          onClick={() => void openSourceInspector(src)}
                          title="Preview highlighted Excel row inside Terra Assistant"
                          aria-label={`Preview ${src.title} (${cellBadge || "row"})`}
                          className="shrink-0 inline-flex items-center justify-center px-2 py-1 border-s border-border/70 text-foreground-muted hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Secondary External Web Sources */}
        {message.externalSources && message.externalSources.length > 0 && (
          <div className="pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 me-1">
              <Globe className="h-3 w-3" />
              External Reference (Non-Policy):
            </span>
            {message.externalSources.map((src, idx) => (
              <button
                key={`ext-${idx}`}
                type="button"
                onClick={() => void openSourceInspector(src)}
                className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 px-2 py-0.5 text-[11px] text-sky-200 transition-colors cursor-pointer"
              >
                <span className="truncate max-w-[180px]">{src.title}</span>
              </button>
            ))}
          </div>
        )}

        {/* Restrained Action Bar */}
        <div className="flex items-center gap-1 pt-0.5">
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy full answer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy response</span>
              </>
            )}
          </button>

          {isLastAssistant && onRetry && message.status !== "streaming" && (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Regenerate response"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
>>>>>>> features
      </div>

      {/* Source Provenance & Live Spreadsheet Row Modal */}
      <Modal
        isOpen={Boolean(selectedSource)}
        onClose={closeSourceInspector}
        size="xl"
        title={selectedSource?.title || "Source Details"}
        description={
          selectedSource?.type === "external"
            ? "External Web Source (Secondary Reference)"
            : "Verified Terra Solutions Knowledge Record"
        }
      >
        {selectedSource && (
          <div className="space-y-3 text-xs text-foreground-muted">
            <div className="rounded-lg border border-border bg-background-tertiary/70 p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <strong className="text-foreground">Source:</strong>{" "}
                {selectedSource.type === "external"
                  ? "External Reference"
                  : "Approved Internal Knowledge Base"}
              </div>
              {selectedSource.file && (
                <div>
                  <strong className="text-foreground">File:</strong>{" "}
                  <code>{selectedSource.file}</code>
                </div>
              )}
              {selectedSource.sheet && (
                <div>
                  <strong className="text-foreground">Worksheet:</strong>{" "}
                  <code>{selectedSource.sheet}</code>
                </div>
              )}
              {selectedSource.rows && selectedSource.rows.length > 0 && (
                <div>
                  <strong className="text-foreground">Row(s) / Cell:</strong>{" "}
                  {selectedSource.rows.join(", ")}
                  {(selectedSource.cellRange || selectedSource.cell) && (
                    <span className="ms-1.5 font-mono text-primary">
                      ({selectedSource.cellRange || selectedSource.cell})
                    </span>
                  )}
                </div>
              )}
              {selectedSource.snippet && (
                <p className="sm:col-span-2 pt-1 leading-relaxed">{selectedSource.snippet}</p>
              )}
            </div>

            {selectedSource.type !== "external" && (
              <SheetCellPreview
                context={sheetContext}
                loading={loadingSheet}
                fallbackUrl={selectedSource.url}
                fallbackSheet={selectedSource.sheet}
                fallbackCellRange={selectedSource.cellRange || selectedSource.cell}
                fallbackRow={selectedSource.row}
                hasSheetGid={selectedSource.hasSheetGid}
              />
            )}

            {selectedSource.type === "external" && selectedSource.url && (
              <a
                href={selectedSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
              >
                Open External Source
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
