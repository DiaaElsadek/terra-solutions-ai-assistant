/**
 * Context-grounded prompt construction.
 * Builds a compact, budget-capped context package from top ranked records,
 * related records, conflicts, and optional external sources.
 */

import type { Message, MessageSource } from "@/types";
import type { KnowledgeRecord } from "@/types/knowledge";
import type { RetrievalOutput } from "@/lib/knowledge/retriever";
import { buildGoogleSheetCellLink } from "@/lib/knowledge/source-links";
import type { ExternalSearchResult } from "@/lib/search/types";
import { SYSTEM_PROMPT } from "@/constants/prompts";

const DEFAULT_MAX_CONTEXT_CHARS = 7500;

export function buildContextPackage(
  retrieval: RetrievalOutput,
  options: {
    maxChars?: number;
    externalResults?: ExternalSearchResult[];
    externalSearchNote?: string;
    contextualAnchors?: string[];
  } = {}
): {
  contextPackage: string;
  sources: MessageSource[];
  externalSources: MessageSource[];
  retrievedRecords: KnowledgeRecord[];
  warnings: string[];
} {
  const maxChars = options.maxChars ?? DEFAULT_MAX_CONTEXT_CHARS;
  const parts: string[] = [];
  const sources: MessageSource[] = [];
  const externalSources: MessageSource[] = [];
  const retrievedRecords: KnowledgeRecord[] = [];
  const warnings: string[] = [];
  let charCount = 0;

  const detectedEntitiesSummary =
    retrieval.entityHints && retrieval.entityHints.length > 0
      ? `, detectedEntities=[${retrieval.entityHints
          .slice(0, 4)
          .map((e) => `${e.canonicalName} (${e.via})`)
          .join(", ")}]`
      : "";

  parts.push(
    `RETRIEVAL METADATA: intent=${retrieval.classified.intent}, confidence=${retrieval.confidence}, language=${retrieval.classified.language}${detectedEntitiesSummary}` +
      (options.contextualAnchors && options.contextualAnchors.length > 0
        ? `, contextAnchors=[${options.contextualAnchors.join(", ")}]`
        : "")
  );

  if (retrieval.requiresClarification && retrieval.clarificationCandidates.length > 0) {
    parts.push(
      `AMBIGUITY DETECTED: Multiple matching candidates exist (${retrieval.clarificationCandidates
        .map((c) => c.name)
        .join("; ")}). Ask a concise clarification question.`
    );
  }

  if (retrieval.results.length === 0 || retrieval.confidence === "none") {
    parts.push(
      "RETRIEVED COMPANY RECORDS: NONE. No reliable match exists in Terra Solutions' dataset. Do NOT fabricate company facts; honestly state that the requested information is unavailable."
    );
  } else {
    parts.push("=== RETRIEVED COMPANY KNOWLEDGE (AUTHORITATIVE) ===");

    for (const item of retrieval.results.slice(0, 5)) {
      const r = item.record;
      const attrLines = Object.entries(r.attributes)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n");
      const priceLines =
        r.prices.length > 0
          ? `  - Verified Prices: ${r.prices.map((p) => p.note).join(" | ")}`
          : "";
      const clinicLines =
        r.clinicIds.length > 0
          ? `  - Linked Clinics: ${r.clinicIds.join(", ")}`
          : "";
      const cellLink = buildGoogleSheetCellLink(r.source);
      const cellInfo = r.source.cellRange ? ` | Cells: ${r.source.cellRange}` : "";
      const block = [
        `[SourceId: ${r.source.sourceId || "source-001"} | File: ${r.source.file} | Sheet: ${r.source.sheet} | Rows: ${r.source.rows.join(", ")}${cellInfo}]`,
        `recordId: ${r.id} | Type: ${r.recordType} | Category: ${r.category} | Score: ${item.score}`,
        `Name: ${r.name}`,
        attrLines,
        priceLines,
        clinicLines,
        `Content:\n${r.description}`,
      ]
        .filter(Boolean)
        .join("\n");

      if (charCount + block.length > maxChars && sources.length >= 1) {
        break;
      }

      parts.push(block);
      charCount += block.length;
      retrievedRecords.push(r);

      sources.push({
        category: r.category,
        title: r.name,
        type: "knowledge",
        file: r.source.file,
        sheet: r.source.sheet,
        rawSheet: r.source.rawSheet,
        row: r.source.row,
        rows: r.source.rows,
        cell: r.source.cell,
        cellRange: r.source.cellRange,
        url: cellLink.url,
        hasSheetGid: cellLink.hasSheetGid,
        confidenceScore: item.score,
        matchReasons: item.matchReasons,
      });
    }

    if (retrieval.relatedRecords.length > 0 && charCount < maxChars - 800) {
      parts.push("=== RELATED RECORDS ===");
      for (const rel of retrieval.relatedRecords.slice(0, 3)) {
        const relBlock = `[Related: recordId=${rel.id} | ${rel.name} (${rel.source.sheet} R${rel.source.row})]\n${rel.description.slice(0, 500)}`;
        if (charCount + relBlock.length > maxChars) break;
        parts.push(relBlock);
        retrievedRecords.push(rel);
        charCount += relBlock.length;
      }
    }
  }

  if (retrieval.conflicts.length > 0) {
    parts.push("=== SOURCE CONFLICTS TO DISCLOSE ===");
    for (const cf of retrieval.conflicts) {
      parts.push(`- [${cf.severity}] ${cf.topic}: ${cf.description}`);
      warnings.push(`Source conflict: ${cf.description}`);
    }
  }

  for (const ind of retrieval.missingIndicators) {
    warnings.push(ind);
  }
  if (retrieval.missingIndicators.length > 0) {
    parts.push("=== MISSING DATA INDICATORS ===");
    retrieval.missingIndicators.forEach((m) => parts.push(`- ${m}`));
  }

  if (options.externalResults && options.externalResults.length > 0) {
    parts.push(
      "=== EXTERNAL WEB SEARCH RESULTS (SECONDARY — NEVER OVERRIDE TERRA DATA) ==="
    );
    for (const ext of options.externalResults.slice(0, 3)) {
      parts.push(
        `[EXTERNAL: ${ext.title} | ${ext.url}]\n${ext.snippet}`
      );
      externalSources.push({
        category: "External Web",
        title: ext.title,
        type: "external",
        url: ext.url,
        snippet: ext.snippet,
        publishedAt: ext.publishedAt,
      });
    }
  } else if (options.externalSearchNote) {
    parts.push(`EXTERNAL SEARCH STATUS: ${options.externalSearchNote}`);
  }

  return {
    contextPackage: parts.join("\n\n"),
    sources,
    externalSources,
    retrievedRecords,
    warnings,
  };
}

export function buildSystemPromptWithContext(contextPackage: string): string {
  return `${SYSTEM_PROMPT}\n\n${contextPackage}`;
}

/**
 * Format conversation history for the AI provider (last N non-error turns).
 */
export function formatConversationHistory(
  messages: Message[],
  maxMessages = 12
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.role !== "system" && m.status !== "error")
    .slice(-maxMessages)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}
