import { clsx } from "clsx";
import {
  normalizeTone,
  sanitizePlainText,
  type SemanticTone,
} from "@/lib/ai/response-schema";
import {
  detectTextDirection,
  dirAlignClass,
  type TextDirection,
} from "@/lib/i18n/bidi";
import { CopyValueButton, TONE_BOX_STYLES } from "./tone-styles";

export interface MetricItem {
  label: string;
  value: string;
  tone?: SemanticTone;
  calculationNote?: string;
}

/**
 * Displays verified numerical values (prices, durations, quantities, percentages)
 * with clear units and one-tap copy, automatically arranging multiple metrics cleanly.
 */
export function ResponseMetricGroup({
  items,
  fallbackDir = "ltr",
}: {
  items: MetricItem[];
  fallbackDir?: TextDirection;
}) {
  const validItems = items
    .map((m) => ({
      label: sanitizePlainText(m.label),
      value: sanitizePlainText(m.value),
      tone: normalizeTone(m.tone, "info"),
      calculationNote: m.calculationNote
        ? sanitizePlainText(m.calculationNote)
        : undefined,
    }))
    .filter((m) => Boolean(m.label && m.value));

  if (validItems.length === 0) return null;

  return (
    <div
      className={clsx(
        "grid gap-2.5",
        validItems.length > 1
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1 max-w-md"
      )}
    >
      {validItems.map((m, idx) => {
        const labelDir = detectTextDirection(m.label, fallbackDir);
        const noteDir = m.calculationNote
          ? detectTextDirection(m.calculationNote, labelDir)
          : labelDir;
        const valDir = detectTextDirection(m.value, "ltr");
        return (
          <div
            key={`${m.label}-${idx}`}
            dir={labelDir}
            className={clsx(
              "rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 terra-subtle-shadow",
              TONE_BOX_STYLES[m.tone]
            )}
          >
            <div className="min-w-0">
              <div
                dir={labelDir}
                className={clsx(
                  "text-[11.5px] font-medium opacity-85 truncate",
                  dirAlignClass(labelDir)
                )}
              >
                {m.label}
              </div>
              {m.calculationNote && (
                <div
                  dir={noteDir}
                  className={clsx(
                    "text-[10.5px] opacity-70 mt-0.5 leading-snug",
                    dirAlignClass(noteDir)
                  )}
                >
                  {m.calculationNote}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <bdi
                dir={valDir}
                className="font-display text-sm sm:text-[15px] font-bold font-mono tabular-nums"
              >
                {m.value}
              </bdi>
              <CopyValueButton value={m.value} label="Copy metric" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

