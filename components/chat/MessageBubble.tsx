"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  FileSpreadsheet,
  Globe,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import type { Message, MessageSource } from "@/types";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { MarkdownRenderer } from "./MarkdownRenderer";

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

const CONFIDENCE_LABELS: Record<
  string,
  { label: string; variant: "success" | "gold" | "warning" | "danger" }
> = {
  strong: { label: "Strong Match", variant: "success" },
  partial: { label: "Partial Match", variant: "warning" },
  ambiguous: { label: "Clarification Suggested", variant: "gold" },
  none: { label: "Not Found in KB", variant: "danger" },
};

/**
 * Renders either a user message bubble or a structured AI response message
 * with inspectable source provenance, confidence tier, warnings, copy, and retry.
 */
export function MessageBubble({
  message,
  userName,
  isLastAssistant = false,
  onRetry,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MessageSource | null>(
    null
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard unavailable */
    }
  };

  if (message.role === "user") {
    return (
      <div className="flex items-start justify-end gap-3 max-w-3xl ms-auto w-full">
        <div className="flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
          <div
            dir="auto"
            className="rounded-2xl rounded-tr-sm bg-user-bubble text-user-bubble-foreground px-4 py-2.5 text-sm font-medium leading-relaxed whitespace-pre-wrap break-words shadow-sm"
          >
            {message.content}
          </div>
          <span
            suppressHydrationWarning
            className="text-[11px] text-foreground-muted/60 px-1"
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
      <div className="flex items-start gap-3 max-w-3xl w-full">
        <Avatar variant="assistant" size="md" />
        <div className="rounded-2xl rounded-tl-sm border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200 space-y-3 max-w-[85%]">
          <div className="flex items-center gap-2 font-medium text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Failed to retrieve response</span>
          </div>
          <p className="text-xs text-red-200/80">
            {message.errorMessage || "An unexpected error occurred."}
          </p>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  const confMeta = message.confidenceLevel
    ? CONFIDENCE_LABELS[message.confidenceLevel]
    : undefined;

  return (
    <div className="group flex items-start gap-3 max-w-3xl w-full">
      <Avatar variant="assistant" size="md" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="rounded-2xl rounded-tl-sm bg-ai-bubble border border-border px-4 py-3.5 sm:px-5 sm:py-4 shadow-sm">
          {/* Top metadata bar */}
          {(confMeta || message.provider) && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
              <div className="flex flex-wrap items-center gap-1.5">
                {confMeta && (
                  <Badge variant={confMeta.variant} className="text-[10px]">
                    {confMeta.label}
                  </Badge>
                )}
                {message.requiresClarification && (
                  <Badge variant="gold" className="text-[10px]">
                    <HelpCircle className="h-3 w-3" />
                    Clarification
                  </Badge>
                )}
              </div>
              {message.provider && (
                <span className="text-[10px] text-foreground-muted/70">
                  {message.provider}
                </span>
              )}
            </div>
          )}

          <MarkdownRenderer content={message.content} />

          {/* Warnings (source conflicts, unavailable data, stopped stream) */}
          {message.warnings && message.warnings.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 space-y-1">
              {message.warnings.map((w, idx) => (
                <p
                  key={idx}
                  className="text-[11px] text-amber-200 flex items-start gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </p>
              ))}
            </div>
          )}

          {/* Company knowledge source chips (clickable for exact Excel provenance) */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/70 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground-muted/80 me-1">
                <FileSpreadsheet className="h-3 w-3 text-primary" />
                Company Sources:
              </span>
              {message.sources.map((src, idx) => (
                <button
                  key={`${src.category}-${src.title}-${idx}`}
                  type="button"
                  onClick={() => setSelectedSource(src)}
                  title="Inspect source file, sheet, row, and match reasons"
                  className="inline-flex items-center gap-1 rounded-md bg-background-secondary border border-border hover:border-primary/60 px-2 py-0.5 text-[11px] text-terra-gold-pale transition-colors cursor-pointer"
                >
                  <span className="text-primary font-medium">{src.category}:</span>
                  <span className="truncate max-w-[160px]">{src.title}</span>
                  {src.row !== undefined && src.row > 0 && (
                    <span className="text-[10px] text-foreground-muted/70">
                      (R{src.row})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* External web sources (always separated from official Terra data) */}
          {message.externalSources && message.externalSources.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-border/50 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 me-1">
                <Globe className="h-3 w-3" />
                External Web (Non-Authoritative):
              </span>
              {message.externalSources.map((src, idx) => (
                <button
                  key={`ext-${idx}`}
                  type="button"
                  onClick={() => setSelectedSource(src)}
                  className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 px-2 py-0.5 text-[11px] text-sky-200 transition-colors cursor-pointer"
                >
                  <span className="truncate max-w-[180px]">{src.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message footer actions */}
        <div className="flex items-center justify-between px-1">
          <span
            suppressHydrationWarning
            className="text-[11px] text-foreground-muted/60"
          >
            {message.status === "streaming"
              ? "Streaming…"
              : formatTime(message.timestamp)}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy response"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>

            {isLastAssistant && onRetry && message.status !== "streaming" && (
              <button
                type="button"
                onClick={onRetry}
                aria-label="Regenerate response"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Source Provenance Details Modal */}
      <Modal
        isOpen={Boolean(selectedSource)}
        onClose={() => setSelectedSource(null)}
        title={selectedSource?.title || "Source Details"}
        description={
          selectedSource?.type === "external"
            ? "External Web Source (Secondary — Not Official Terra Policy)"
            : "Verified Terra Solutions Company Knowledge Source"
        }
      >
        {selectedSource && (
          <div className="space-y-3 text-xs text-foreground-muted">
            <div className="rounded-lg border border-border bg-background-tertiary p-3 space-y-1.5">
              <div>
                <strong className="text-foreground">Source Type:</strong>{" "}
                {selectedSource.type === "external"
                  ? "External Web Search"
                  : "Official Internal Knowledge Base"}
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
                  <strong className="text-foreground">Excel Row(s):</strong>{" "}
                  {selectedSource.rows.join(", ")}
                </div>
              )}
              {selectedSource.confidenceScore !== undefined && (
                <div>
                  <strong className="text-foreground">Retrieval Score:</strong>{" "}
                  {selectedSource.confidenceScore}
                </div>
              )}
              {selectedSource.matchReasons &&
                selectedSource.matchReasons.length > 0 && (
                  <div>
                    <strong className="text-foreground">Match Reasons:</strong>{" "}
                    {selectedSource.matchReasons.join("; ")}
                  </div>
                )}
              {selectedSource.snippet && (
                <p className="pt-1 leading-relaxed">{selectedSource.snippet}</p>
              )}
              {selectedSource.publishedAt && (
                <div>
                  <strong className="text-foreground">Published:</strong>{" "}
                  {selectedSource.publishedAt}
                </div>
              )}
            </div>

            {selectedSource.url && (
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
