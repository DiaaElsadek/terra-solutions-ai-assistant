/**
 * Structured LLM response validation & safe normalization.
 * Prevents malformed LLM JSON or hallucinated fields from crashing UI rendering.
 */

import type { RetrievalConfidence } from "@/types/knowledge";
import type { StructuredAIOutput } from "./types";

const VALID_CONFIDENCE = new Set<RetrievalConfidence>([
  "strong",
  "partial",
  "ambiguous",
  "none",
]);

const VALID_LANGS = new Set(["ar", "en", "mixed"]);

/** Extract JSON payload even if an upstream model wraps it in markdown fences. */
function extractJsonCandidate(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export function validateAndNormalizeStructuredOutput(
  rawText: string,
  fallback: Omit<StructuredAIOutput, "answer">
): StructuredAIOutput {
  const candidate = extractJsonCandidate(rawText);
  try {
    const parsed = JSON.parse(candidate) as Record<string, unknown>;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.answer === "string" &&
      parsed.answer.trim().length > 0
    ) {
      const language = VALID_LANGS.has(String(parsed.language))
        ? (parsed.language as "ar" | "en" | "mixed")
        : fallback.language;

      const confidenceLevel = VALID_CONFIDENCE.has(
        parsed.confidenceLevel as RetrievalConfidence
      )
        ? (parsed.confidenceLevel as RetrievalConfidence)
        : fallback.confidenceLevel;

      const warnings = Array.isArray(parsed.warnings)
        ? parsed.warnings
            .filter((w): w is string => typeof w === "string" && w.trim() !== "")
            .slice(0, 6)
        : fallback.warnings;

      const clarificationQuestion =
        typeof parsed.clarificationQuestion === "string" &&
        parsed.clarificationQuestion.trim()
          ? parsed.clarificationQuestion.trim()
          : fallback.clarificationQuestion;

      return {
        answer: parsed.answer.trim(),
        language,
        intent:
          typeof parsed.intent === "string" && parsed.intent.trim()
            ? parsed.intent.trim()
            : fallback.intent,
        confidenceLevel,
        requiresClarification:
          typeof parsed.requiresClarification === "boolean"
            ? parsed.requiresClarification
            : fallback.requiresClarification,
        clarificationQuestion,
        warnings,
      };
    }
  } catch {
    // Upstream returned plain Markdown instead of JSON — wrap safely
  }

  return {
    answer: rawText.trim() || "No answer was generated.",
    language: fallback.language,
    intent: fallback.intent,
    confidenceLevel: fallback.confidenceLevel,
    requiresClarification: fallback.requiresClarification,
    clarificationQuestion: fallback.clarificationQuestion,
    warnings: fallback.warnings,
  };
}

