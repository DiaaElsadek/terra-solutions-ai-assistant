/**
 * Structured LLM response validation & safe normalization helpers.
 */

import type { RetrievalConfidence, KnowledgeRecord } from "@/types/knowledge";
import type { StructuredAIOutput } from "./types";
import {
  extractJsonString,
  sanitizePlainText,
  validateModelRichResponse,
} from "./response-schema";

const VALID_CONFIDENCE = new Set<RetrievalConfidence>([
  "strong",
  "partial",
  "ambiguous",
  "none",
]);

const VALID_LANGS = new Set(["ar", "en", "mixed"]);

export { validateModelRichResponse, richResponseToMarkdown } from "./response-schema";

/**
 * Legacy-compatible normalizer that also accepts RichAIResponse JSON payloads.
 */
export function validateAndNormalizeStructuredOutput(
  rawText: string,
  fallback: Omit<StructuredAIOutput, "answer">,
  options?: {
    retrievedRecords?: KnowledgeRecord[];
    provider?: "gemini" | "openai";
    model?: string;
  }
): StructuredAIOutput {
  if (options?.retrievedRecords) {
    const validated = validateModelRichResponse(rawText, {
      retrievedRecords: options.retrievedRecords,
      confidence: fallback.confidenceLevel,
      fallbackLanguage: fallback.language,
      provider: options.provider || "gemini",
      model: options.model || "unknown",
    });
    if (validated.ok && validated.response) {
      const r = validated.response;
      const derivedConf: RetrievalConfidence =
        r.status === "not_found"
          ? "none"
          : r.status === "clarification"
          ? "ambiguous"
          : r.status === "partial"
          ? "partial"
          : "strong";

      return {
        answer: r.answer.summary,
        language: r.language,
        intent: fallback.intent,
        confidenceLevel: derivedConf,
        requiresClarification: r.status === "clarification" || fallback.requiresClarification,
        clarificationQuestion: fallback.clarificationQuestion,
        warnings: fallback.warnings,
        structured: r,
      };
    }
  }

  const candidate = extractJsonString(rawText);
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
            .map(sanitizePlainText)
            .filter(Boolean)
            .slice(0, 6)
        : fallback.warnings;

      const clarificationQuestion =
        typeof parsed.clarificationQuestion === "string" &&
        parsed.clarificationQuestion.trim()
          ? sanitizePlainText(parsed.clarificationQuestion)
          : fallback.clarificationQuestion;

      return {
        answer: sanitizePlainText(parsed.answer) || parsed.answer.trim(),
        language,
        intent:
          typeof parsed.intent === "string" && parsed.intent.trim()
            ? sanitizePlainText(parsed.intent)
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
    // Plain Markdown/text response wrapped safely below
  }

  return {
    answer: sanitizePlainText(rawText) || "No answer was generated.",
    language: fallback.language,
    intent: fallback.intent,
    confidenceLevel: fallback.confidenceLevel,
    requiresClarification: fallback.requiresClarification,
    clarificationQuestion: fallback.clarificationQuestion,
    warnings: fallback.warnings,
  };
}
