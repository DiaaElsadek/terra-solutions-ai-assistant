import { clsx } from "clsx";
import {
  normalizeTone,
  sanitizePlainText,
  type SemanticTone,
} from "@/lib/ai/response-schema";
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
export function ResponseMetricGroup({ items }: { items: MetricItem[] }) {
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
      {validItems.map((m, idx) => (
        <div
          key={`${m.label}-${idx}`}
          dir="auto"
          className={clsx(
            "rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 terra-subtle-shadow",
            TONE_BOX_STYLES[m.tone]
          )}
        >
          <div className="min-w-0">
            <div className="text-[11.5px] font-medium opacity-85 truncate">
              {m.label}
            </div>
            {m.calculationNote && (
              <div className="text-[10.5px] opacity-70 mt-0.5 leading-snug">
                {m.calculationNote}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-display text-sm sm:text-[15px] font-bold font-mono tabular-nums">
              {m.value}
            </span>
            <CopyValueButton value={m.value} label="Copy metric" />
          </div>
        </div>
      ))}
    </div>
  );
}

