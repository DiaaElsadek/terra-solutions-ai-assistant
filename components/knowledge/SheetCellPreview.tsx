"use client";

import { useEffect, useRef } from "react";
import { ExternalLink, FileSpreadsheet, Info } from "lucide-react";
import { clsx } from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import { RichText } from "@/components/ui/RichText";

export interface SheetContextRowData {
  row: number;
  cells: Record<string, string>;
  isTarget: boolean;
}

export interface SheetContextData {
  file: string;
  sheet: string;
  rawSheet: string;
  targetRow: number;
  targetCell?: string;
  sourceUrl?: string;
  hasSheetGid: boolean;
  columns: string[];
  rows: SheetContextRowData[];
}

interface SheetCellPreviewProps {
  context: SheetContextData | null;
  loading?: boolean;
  fallbackUrl?: string;
  fallbackSheet?: string;
  fallbackCellRange?: string;
  fallbackRow?: number;
  hasSheetGid?: boolean;
}

/**
 * Interactive spreadsheet excerpt highlighting the exact target row/cell
 * and providing a direct external link into the company Google Sheet.
 */
export function SheetCellPreview({
  context,
  loading = false,
  fallbackUrl,
  fallbackSheet,
  fallbackCellRange,
  fallbackRow,
  hasSheetGid,
}: SheetCellPreviewProps) {
  const targetRowRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (context?.rows?.length && targetRowRef.current) {
      targetRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [context]);

  const effectiveUrl = context?.sourceUrl || fallbackUrl;
  const effectiveSheet = context?.sheet || fallbackSheet || "Worksheet";
  const effectiveRange =
    fallbackCellRange ||
    context?.targetCell ||
    (fallbackRow && fallbackRow > 0 ? `Row ${fallbackRow}` : undefined);
  const gidResolved = context ? context.hasSheetGid : Boolean(hasSheetGid);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background-secondary/70 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-foreground-muted min-w-0">
          <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
          <span className="truncate">
            Tab: <strong className="text-foreground">{effectiveSheet}</strong>
            {effectiveRange && (
              <>
                {" · "}
                Cell: <code className="text-primary font-semibold">{effectiveRange}</code>
              </>
            )}
          </span>
        </div>

        {effectiveUrl && (
          <a
            href={effectiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shrink-0"
          >
            <span>Open {effectiveRange || "Row"} in Google Sheets</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {effectiveUrl && !gidResolved && (
        <p className="text-[11px] text-foreground-muted/80 flex items-start gap-1.5 px-1">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            Google Sheets opens at range <code>{effectiveRange}</code>; switch to tab{" "}
            <strong className="text-foreground">{effectiveSheet}</strong> at the bottom if
            tab <code>gid</code> is not yet mapped in <code>GOOGLE_SHEETS_GIDS</code>.
          </span>
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background-tertiary/50 p-4 text-xs text-foreground-muted">
          <Spinner size="sm" className="text-primary" />
          <span>Loading exact spreadsheet rows…</span>
        </div>
      )}

      {!loading && context && context.rows.length > 0 && (
        <div className="max-h-60 overflow-auto rounded-xl border border-border bg-background-secondary/40">
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-background-secondary text-primary border-b border-border z-10">
              <tr>
                <th className="px-2.5 py-1.5 text-start font-mono font-semibold border-e border-border/60 w-12">
                  Row
                </th>
                {context.columns.map((col) => (
                  <th
                    key={col}
                    className="px-2.5 py-1.5 text-start font-mono font-semibold whitespace-nowrap"
                  >
                    Col {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {context.rows.map((r) => (
                <tr
                  key={r.row}
                  ref={r.isTarget ? targetRowRef : undefined}
                  className={clsx(
                    "transition-colors",
                    r.isTarget
                      ? "bg-primary/15 text-terra-gold-light"
                      : "text-foreground-muted/80 hover:bg-background-tertiary/40"
                  )}
                >
                  <td
                    className={clsx(
                      "px-2.5 py-2 border-t border-e border-border/60 font-mono align-top whitespace-nowrap",
                      r.isTarget ? "text-primary font-bold" : "text-foreground-muted/70"
                    )}
                  >
                    {r.row}
                  </td>
                  {context.columns.map((col) => {
                    const val = r.cells[col];
                    const coord = `${col}${r.row}`;
                    const isPrimaryCell =
                      r.isTarget &&
                      (context.targetCell === coord ||
                        (!context.targetCell && col === context.columns[0]));
                    return (
                      <td
                        key={col}
                        dir="auto"
                        className={clsx(
                          "px-2.5 py-2 border-t border-border/60 align-top whitespace-pre-wrap max-w-[220px]",
                          isPrimaryCell && "ring-1 ring-inset ring-primary/70 bg-primary/10"
                        )}
                      >
                        <div className="text-[9px] font-mono text-primary/70 mb-0.5">
                          {coord}
                        </div>
                        <div>{val ? <RichText text={val} /> : "—"}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
