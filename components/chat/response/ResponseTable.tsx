"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { clsx } from "clsx";
import { sanitizePlainText, stripSemanticTags } from "@/lib/ai/response-schema";
import { renderTextWithLucide } from "@/components/ui/RichText";
import { CopyValueButton } from "./tone-styles";

export interface TableColumnSpec {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
}

function shouldOfferCellCopy(val: string): boolean {
  const clean = stripSemanticTags(val);
  if (!clean || clean === "—") return false;
  return /\d/.test(clean) && clean.length <= 45;
}

interface ResponseTableProps {
  cols: TableColumnSpec[];
  rows: Array<Record<string, unknown>>;
  title?: string;
}

/**
 * Executive data & comparison table with RTL-aware alignment, primary column emphasis,
 * one-click table copy, hover numeric copy, and clean empty value placeholders.
 */
export function ResponseTable({ cols, rows, title }: ResponseTableProps) {
  const [tableCopied, setTableCopied] = useState(false);

  if (cols.length === 0 || rows.length === 0) return null;

  const handleCopyTable = async () => {
    try {
      const headerLine = cols.map((c) => sanitizePlainText(c.label)).join("\t");
      const dataLines = rows.map((r) =>
        cols
          .map((c) => {
            const raw = r?.[c.key];
            if (raw === undefined || raw === null || raw === "") return "—";
            return stripSemanticTags(String(raw)).replace(/\s+/g, " ").trim() || "—";
          })
          .join("\t")
      );
      await navigator.clipboard.writeText([headerLine, ...dataLines].join("\n"));
      setTableCopied(true);
      setTimeout(() => setTableCopied(false), 1600);
    } catch {
      /* Clipboard unavailable */
    }
  };

  return (
    <div className="my-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        {title ? (
          <p
            dir="auto"
            className="text-xs font-display font-semibold text-terra-gold-light tracking-wide"
          >
            {renderTextWithLucide(sanitizePlainText(title))}
          </p>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={() => void handleCopyTable()}
          aria-label="Copy table rows"
          className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background-secondary/70 px-2 py-0.5 text-[10.5px] font-medium text-foreground-muted hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
        >
          {tableCopied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Table copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy table</span>
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/80 bg-[#120E08] terra-subtle-shadow">
        <table className="w-full text-[13px] border-collapse">
          <thead className="bg-[#1B150B] text-terra-gold-pale border-b border-border/85">
            <tr>
              {cols.map((col) => (
                <th
                  key={col.key}
                  dir="auto"
                  className={clsx(
                    "px-3.5 py-2.5 text-[11px] font-display font-semibold tracking-wide whitespace-nowrap",
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
                className="odd:bg-transparent even:bg-white/[0.015] hover:bg-background-tertiary/55 transition-colors duration-100"
              >
                {cols.map((col, cIdx) => {
                  const rawCell = row?.[col.key];
                  const cellVal =
                    rawCell === undefined || rawCell === null || rawCell === ""
                      ? "—"
                      : String(rawCell).trim() || "—";
                  const isMissing = cellVal === "—";
                  const copyText = stripSemanticTags(cellVal);

                  return (
                    <td
                      key={col.key}
                      dir="auto"
                      className={clsx(
                        "group/cell px-3.5 py-2.5 align-top leading-relaxed",
                        isMissing
                          ? "text-foreground-muted/40"
                          : cIdx === 0
                          ? "font-medium text-foreground"
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
                          <CopyValueButton value={copyText} revealOnHover />
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

