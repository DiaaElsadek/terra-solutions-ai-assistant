"use client";

import { clsx } from "clsx";
import { sanitizePlainText, stripSemanticTags } from "@/lib/ai/response-schema";
import { BidiText, renderTextWithLucide } from "@/components/ui/RichText";
import {
  detectTextDirection,
  dirAlignClass,
  splitBilingualLines,
  type TextDirection,
} from "@/lib/i18n/bidi";
import { CopyValueButton } from "./tone-styles";

export interface InformationRow {
  field: string;
  value: string;
}

interface InformationCardProps {
  title?: string;
  rows: InformationRow[];
  fallbackDir?: TextDirection;
}

function classifyFieldTone(field: string, value: string): "success" | "danger" | "warning" | "default" {
  const f = field.toLowerCase();
  const v = stripSemanticTags(value).toLowerCase();
  if (/^\s*(—|-|unavailable|not available|غير متوفر)\s*$/i.test(v)) return "warning";
  if (/(pregnancy|lactation|contraindic|restriction|الحمل|الرضاعة|موانع|تحذير)/i.test(f)) {
    if (/(not allowed|contraindicated|avoid|prohibited|ممنوع|لا ينصح|غير مسموح|❌)/i.test(v)) {
      return "danger";
    }
    if (/(allowed|safe|permitted|مسموح|آمن|✅)/i.test(v)) {
      return "success";
    }
    return "warning";
  }
  if (/(price|cost|aed|سعر|تكلفة)/i.test(f) && /\d/.test(v)) {
    return "success";
  }
  return "default";
}

function isQuickCopyable(value: string): boolean {
  const clean = stripSemanticTags(value).trim();
  if (!clean || clean === "—") return false;
  return /\d/.test(clean) && clean.length <= 45;
}

/**
 * Compact executive key-value grid for service specifications, safety status,
 * target areas, sessions, and clinical constraints extracted from attribute tables.
 */
export function InformationCard({
  title,
  rows,
  fallbackDir = "ltr",
}: InformationCardProps) {
  const validRows = rows
    .map((r) => ({
      field: sanitizePlainText(r.field),
      value: String(r.value ?? "").trim() || "—",
    }))
    .filter((r) => r.field.length > 0);

  if (validRows.length === 0) return null;

  const sampleCardText = [
    title ?? "",
    ...validRows.map((r) => `${r.field} ${r.value}`),
  ].join(" ");
  const cardDir = detectTextDirection(sampleCardText, fallbackDir);
  const titleText = title ? sanitizePlainText(title) : "";
  const titleDir = titleText ? detectTextDirection(titleText, cardDir) : cardDir;

  return (
    <div className="my-2.5 overflow-hidden rounded-xl border border-border/80 bg-[#120E08] terra-subtle-shadow">
      {titleText && (
        <div
          dir={titleDir}
          className={clsx(
            "border-b border-border/75 bg-[#1B150B] px-3.5 py-2 text-[11px] font-display font-semibold uppercase tracking-wider text-terra-gold-pale",
            dirAlignClass(titleDir)
          )}
        >
          {renderTextWithLucide(titleText, titleDir)}
        </div>
      )}

      <dl
        dir={cardDir}
        className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:gap-px sm:bg-border/45"
      >
        {validRows.map((item, idx) => {
          const tone = classifyFieldTone(item.field, item.value);
          const cleanCopy = stripSemanticTags(item.value);
          const isWide = validRows.length % 2 === 1 && idx === validRows.length - 1;
          const dtDir = detectTextDirection(item.field, cardDir);
          const ddLines = splitBilingualLines(item.value, cardDir);
          const ddDir = ddLines[0]?.dir ?? detectTextDirection(item.value, cardDir);

          return (
            <div
              key={`${item.field}-${idx}`}
              className={clsx(
                "group/cell bg-[#120E08] px-3.5 py-2.5 flex flex-col gap-1 transition-colors hover:bg-background-tertiary/40",
                isWide && "sm:col-span-2"
              )}
            >
              <dt
                dir={dtDir}
                className={clsx(
                  "text-[11px] font-medium text-foreground-muted/85",
                  dirAlignClass(dtDir)
                )}
              >
                {renderTextWithLucide(item.field, dtDir)}
              </dt>
              <dd
                dir={ddDir}
                className={clsx(
                  "flex items-start justify-between gap-2 text-[13px] leading-snug",
                  dirAlignClass(ddDir),
                  tone === "success"
                    ? "text-emerald-300 font-medium"
                    : tone === "danger"
                    ? "text-red-300 font-medium"
                    : tone === "warning"
                    ? "text-amber-200"
                    : "text-terra-gold-light"
                )}
              >
                <div className="min-w-0 flex-1 break-words space-y-0.5">
                  <BidiText text={item.value} fallbackDir={ddDir} />
                </div>
                {isQuickCopyable(item.value) && (
                  <CopyValueButton value={cleanCopy} revealOnHover label="Copy value" />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

