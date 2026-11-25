"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Globe,
} from "lucide-react";
import type { MessageSource } from "@/types";
import { buildGoogleSheetCellLink } from "@/lib/knowledge/source-links";

interface SourceReferenceTrayProps {
  sources?: MessageSource[];
  externalSources?: MessageSource[];
  onInspectSource: (source: MessageSource) => void;
}

/**
 * Secondary collapsible citation panel presenting source file, worksheet name,
 * category, and row/cell references without overwhelming the answer content.
 */
export function SourceReferenceTray({
  sources,
  externalSources,
  onInspectSource,
}: SourceReferenceTrayProps) {
  const [expanded, setExpanded] = useState(
    Boolean(sources && sources.length > 0 && sources.length <= 3)
  );

  const hasCompany = Boolean(sources && sources.length > 0);
  const hasExternal = Boolean(externalSources && externalSources.length > 0);

  if (!hasCompany && !hasExternal) return null;

  const uniqueSheets = Array.from(
    new Set(
      (sources || [])
        .map((s) => s.sheet || s.category)
        .filter((v): v is string => Boolean(v))
    )
  ).slice(0, 2);

  return (
    <div className="pt-2 border-t border-border/55 space-y-2">
      {hasCompany && sources && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-lg border border-border/70 bg-background-secondary/60 px-2.5 py-1 text-[11px] font-medium text-foreground-muted hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Sources ({sources.length})</span>
            {!expanded && uniqueSheets.length > 0 && (
              <span className="text-[10.5px] text-foreground-muted/70 truncate max-w-[200px] sm:max-w-[320px]">
                · {uniqueSheets.join(", ")}
              </span>
            )}
            {expanded ? (
              <ChevronUp className="h-3 w-3 shrink-0" />
            ) : (
              <ChevronDown className="h-3 w-3 shrink-0" />
            )}
          </button>

          {expanded && (
            <div className="flex flex-wrap items-center gap-1.5 terra-animate-in">
              {sources.map((src, idx) => {
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
                    className="inline-flex max-w-full items-center rounded-lg bg-background-secondary border border-border hover:border-primary/60 transition-colors overflow-hidden"
                  >
                    {targetUrl ? (
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Move to ${src.sheet || src.category} ${cellBadge || "row"} in Google Sheets`}
                        aria-label={`Open ${src.title} (${cellBadge || "row"}) in Google Sheets`}
                        className="inline-flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors"
                      >
                        <span className="text-primary font-medium truncate max-w-[105px] sm:max-w-[135px]">
                          {src.sheet || src.category}
                        </span>
                        <span className="truncate min-w-0 max-w-[130px] sm:max-w-[175px] text-foreground-muted">
                          {src.title}
                        </span>
                        {cellBadge && (
                          <span className="shrink-0 rounded bg-primary/10 px-1 py-px text-[10px] font-mono text-primary">
                            {cellBadge}
                          </span>
                        )}
                        <ExternalLink className="h-3 w-3 shrink-0 text-primary/80" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onInspectSource(src)}
                        title="Inspect source record details"
                        className="inline-flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1 text-[11px] text-terra-gold-pale hover:text-foreground transition-colors cursor-pointer"
                      >
                        <span className="text-primary font-medium truncate max-w-[105px] sm:max-w-[135px]">
                          {src.sheet || src.category}
                        </span>
                        <span className="truncate min-w-0 max-w-[130px] sm:max-w-[175px] text-foreground-muted">
                          {src.title}
                        </span>
                        {cellBadge && (
                          <span className="shrink-0 rounded bg-primary/10 px-1 py-px text-[10px] font-mono text-primary">
                            {cellBadge}
                          </span>
                        )}
                      </button>
                    )}
                    {src.type !== "external" && src.row !== undefined && src.row > 0 && (
                      <button
                        type="button"
                        onClick={() => onInspectSource(src)}
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

      {hasExternal && externalSources && (
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 me-1">
            <Globe className="h-3 w-3" />
            External Reference (Non-Policy):
          </span>
          {externalSources.map((src, idx) => (
            <button
              key={`ext-${idx}`}
              type="button"
              onClick={() => onInspectSource(src)}
              className="inline-flex items-center gap-1 rounded-md bg-sky-500/10 border border-sky-500/30 hover:border-sky-400 px-2 py-0.5 text-[11px] text-sky-200 transition-colors cursor-pointer"
            >
              <span className="truncate max-w-[180px]">{src.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

