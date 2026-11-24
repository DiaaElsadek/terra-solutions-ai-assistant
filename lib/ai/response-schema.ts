/**
 * Rich Structured AI Response Protocol (Discriminated Union + Runtime Validator).
 *
 * Security & Reliability Guarantees:
 * - Zero unrestricted HTML/CSS: semantic tones only, raw tags scrubbed.
 * - Strict runtime validation of every block type and table row shape.
 * - Server-side source verification: only cites records actually retrieved by the backend.
 */

import type { MessageSource } from "@/types";
import type { KnowledgeRecord, RetrievalConfidence } from "@/types/knowledge";
import { buildGoogleSheetCellLink } from "@/lib/knowledge/source-links";

export type SemanticTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "accent"
  | "important";

export type AIErrorCode =
  | "MISSING_API_KEY"
  | "GEMINI_TIMEOUT"
  | "GEMINI_RATE_LIMIT"
  | "GEMINI_UNAVAILABLE"
  | "INVALID_MODEL_RESPONSE"
  | "KNOWLEDGE_RETRIEVAL_ERROR"
  | "INVALID_REQUEST";

export type AIResponseStatus =
  | "success"
  | "partial"
  | "clarification"
  | "not_found";

export interface VerifiedSourceReference {
  recordId: string;
  sourceId?: string;
  fileName: string;
  sheetName: string;
  rawSheet?: string;
  rowNumber: number;
  cell?: string;
  cellRange?: string;
  sourceUrl?: string;
  hasSheetGid?: boolean;
  title?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  align?: "start" | "center" | "end";
}

export type RichResponseBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string; tone?: SemanticTone }
  | { type: "paragraph"; text: string; tone?: SemanticTone }
  | {
      type: "list";
      style: "bullet" | "numbered";
      title?: string;
      items: string[];
      tone?: SemanticTone;
    }
  | {
      type: "table";
      title?: string;
      columns: TableColumn[];
      rows: Array<Record<string, string>>;
    }
  | {
      type: "metric";
      label: string;
      value: string;
      tone?: SemanticTone;
      calculationNote?: string;
    }
  | { type: "badge"; label: string; tone?: SemanticTone }
  | { type: "callout"; tone: SemanticTone; title?: string; text: string }
  | { type: "quote"; text: string; citation?: string }
  | { type: "divider" }
  | {
      type: "source_list";
      title?: string;
      items: Array<{
        recordId?: string;
        sourceId?: string;
        fileName: string;
        sheetName?: string;
        rawSheet?: string;
        rowNumber?: number;
        cell?: string;
        cellRange?: string;
        sourceUrl?: string;
        hasSheetGid?: boolean;
        title?: string;
      }>;
    };

export interface RichAIResponse {
  schemaVersion: "1.0";
  language: "ar" | "en" | "mixed";
  status: AIResponseStatus;
  answer: {
    summary: string;
    blocks: RichResponseBlock[];
  };
  sources: VerifiedSourceReference[];
  meta: {
    provider: "gemini" | "local_fallback" | "openai";
    model: string;
    grounded: boolean;
    fallbackReason?: string;
    errorCategory?: AIErrorCode;
  };
}

export const ALLOWED_SEMANTIC_TONES = new Set<SemanticTone>([
  "default",
  "success",
  "warning",
  "danger",
  "info",
  "muted",
  "accent",
  "important",
]);

export const INLINE_SEMANTIC_TAGS = [
  "important",
  "warning",
  "success",
  "danger",
  "info",
  "muted",
] as const;

export type InlineSemanticTag = (typeof INLINE_SEMANTIC_TAGS)[number];

export const ALLOWED_BLOCK_TYPES = new Set<RichResponseBlock["type"]>([
  "heading",
  "paragraph",
  "list",
  "table",
  "metric",
  "badge",
  "callout",
  "quote",
  "divider",
  "source_list",
]);

/** Remove HTML/script markup from model output so only safe plain text reaches renderers. */
export function sanitizePlainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "")
    .trim();
}

const VALID_INLINE_SEMANTIC_PAIR_RE =
  /<(important|warning|success|danger|info|muted)>([^<]*(?:<(?!\/?(?:script|style)\b)[^<]*)*?)<\/\1>/gi;

/**
 * Sanitizes rich inline text while preserving strictly attribute-free paired
 * semantic highlight tags (`<important>`, `<warning>`, `<success>`, `<danger>`, `<info>`, `<muted>`).
 * Any HTML, script/style blocks, attributes, unknown tags, or unclosed markers
 * degrade cleanly to safe plain text.
 */
export function sanitizeRichText(value: unknown): string {
  if (typeof value !== "string") return "";
  const withoutScripts = value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");

  const preserved: string[] = [];
  const tokenized = withoutScripts.replace(
    VALID_INLINE_SEMANTIC_PAIR_RE,
    (_full, rawTag: string, inner: string) => {
      const cleanTag = rawTag.toLowerCase();
      const cleanInner = sanitizePlainText(inner);
      if (!cleanInner) return "";
      const token = `\u0000TERRA_SEM_${preserved.length}\u0000`;
      preserved.push(`<${cleanTag}>${cleanInner}</${cleanTag}>`);
      return token;
    }
  );

  const strippedRest = tokenized.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  return strippedRest
    .replace(/\u0000TERRA_SEM_(\d+)\u0000/g, (_m, idx) => preserved[Number(idx)] ?? "")
    .trim();
}

/** Remove semantic highlight wrappers cleanly for plain-text copy/summaries. */
export function stripSemanticTags(text: string): string {
  return text.replace(/<\/?(important|warning|success|danger|info|muted)>/gi, "");
}

export function normalizeTone(value: unknown, fallback: SemanticTone = "default"): SemanticTone {
  return typeof value === "string" && ALLOWED_SEMANTIC_TONES.has(value as SemanticTone)
    ? (value as SemanticTone)
    : fallback;
}

export function validateSingleBlock(raw: unknown): RichResponseBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const type = obj.type;
  if (typeof type !== "string" || !ALLOWED_BLOCK_TYPES.has(type as RichResponseBlock["type"])) {
    return null;
  }

  switch (type) {
    case "heading": {
      const text = sanitizePlainText(obj.text);
      if (!text) return null;
      const lvl = obj.level === 1 || obj.level === 2 || obj.level === 3 ? obj.level : 2;
      return { type: "heading", level: lvl, text, tone: normalizeTone(obj.tone, "accent") };
    }
    case "paragraph": {
      const text = sanitizeRichText(obj.text);
      if (!text) return null;
      return { type: "paragraph", text, tone: normalizeTone(obj.tone) };
    }
    case "list": {
      const rawItems = Array.isArray(obj.items) ? obj.items : [];
      const items = rawItems.map(sanitizeRichText).filter(Boolean).slice(0, 40);
      if (items.length === 0) return null;
      const title = sanitizePlainText(obj.title) || undefined;
      return {
        type: "list",
        style: obj.style === "numbered" ? "numbered" : "bullet",
        title,
        items,
        tone: normalizeTone(obj.tone),
      };
    }
    case "table": {
      const rawCols = Array.isArray(obj.columns) ? obj.columns : [];
      const columns: TableColumn[] = rawCols
        .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === "object"))
        .map((c, idx): TableColumn => {
          const alignVal: TableColumn["align"] =
            c.align === "center"
              ? "center"
              : c.align === "end"
              ? "end"
              : "start";
          return {
            key: sanitizePlainText(c.key) || `col_${idx}`,
            label: sanitizePlainText(c.label) || sanitizePlainText(c.key) || `Column ${idx + 1}`,
            align: alignVal,
          };
        })
        .filter((c) => Boolean(c.key));
      const rawRows = Array.isArray(obj.rows) ? obj.rows : [];
      if (columns.length === 0 || rawRows.length === 0) return null;

      const rows: Array<Record<string, string>> = rawRows
        .filter((r): r is Record<string, unknown> => Boolean(r && typeof r === "object"))
        .slice(0, 30)
        .map((r) => {
          const cleanRow: Record<string, string> = {};
          for (const col of columns) {
            const val = r[col.key];
            cleanRow[col.key] =
              val === undefined || val === null || val === ""
                ? "—"
                : sanitizeRichText(String(val)) || "—";
          }
          return cleanRow;
        });

      if (rows.length === 0) return null;
      return {
        type: "table",
        title: sanitizePlainText(obj.title) || undefined,
        columns,
        rows,
      };
    }
    case "metric": {
      const label = sanitizePlainText(obj.label);
      const value = sanitizePlainText(obj.value);
      if (!label || !value) return null;
      const calculationNote = sanitizePlainText(obj.calculationNote) || undefined;
      return {
        type: "metric",
        label,
        value,
        tone: normalizeTone(obj.tone, "info"),
        calculationNote,
      };
    }
    case "badge": {
      const label = sanitizePlainText(obj.label);
      if (!label) return null;
      return { type: "badge", label, tone: normalizeTone(obj.tone, "accent") };
    }
    case "callout": {
      const text = sanitizeRichText(obj.text);
      if (!text) return null;
      return {
        type: "callout",
        tone: normalizeTone(obj.tone, "warning"),
        title: sanitizePlainText(obj.title) || undefined,
        text,
      };
    }
    case "quote": {
      const text = sanitizeRichText(obj.text);
      if (!text) return null;
      return {
        type: "quote",
        text,
        citation: sanitizePlainText(obj.citation) || undefined,
      };
    }
    case "divider":
      return { type: "divider" };
    case "source_list": {
      const rawItems = Array.isArray(obj.items) ? obj.items : [];
      const items = rawItems
        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === "object"))
        .map((s) => ({
          recordId: sanitizePlainText(s.recordId) || undefined,
          sourceId: sanitizePlainText(s.sourceId) || undefined,
          fileName: sanitizePlainText(s.fileName) || "Knowlege.xlsx",
          sheetName: sanitizePlainText(s.sheetName) || undefined,
          rawSheet: typeof s.rawSheet === "string" ? s.rawSheet : undefined,
          rowNumber: typeof s.rowNumber === "number" ? s.rowNumber : undefined,
          cell: sanitizePlainText(s.cell) || undefined,
          cellRange: sanitizePlainText(s.cellRange) || undefined,
          sourceUrl: typeof s.sourceUrl === "string" && s.sourceUrl.startsWith("https://") ? s.sourceUrl : undefined,
          hasSheetGid: typeof s.hasSheetGid === "boolean" ? s.hasSheetGid : undefined,
          title: sanitizePlainText(s.title) || undefined,
        }))
        .filter((s) => Boolean(s.fileName));
      if (items.length === 0) return null;
      return {
        type: "source_list",
        title: sanitizePlainText(obj.title) || undefined,
        items,
      };
    }
    default:
      return null;
  }
}

/** Extract JSON payload if wrapped in markdown fences or surrounding prose. */
export function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return trimmed;
}

export function toVerifiedSourceReference(rec: KnowledgeRecord): VerifiedSourceReference {
  const link = buildGoogleSheetCellLink(rec.source);
  return {
    recordId: rec.id,
    sourceId: rec.source.sourceId || "source-001",
    fileName: rec.source.file,
    sheetName: rec.source.sheet,
    rawSheet: rec.source.rawSheet,
    rowNumber: rec.source.row,
    cell: rec.source.cell,
    cellRange: rec.source.cellRange,
    sourceUrl: link.url,
    hasSheetGid: link.hasSheetGid,
    title: rec.name,
  };
}

export interface SchemaValidationOutcome {
  ok: boolean;
  response?: RichAIResponse;
  error?: string;
}

/**
 * Validate raw LLM JSON text against RichAIResponse, filter unknown/malformed blocks,
 * and verify all citations against retrieved backend KnowledgeRecords.
 */
export function validateModelRichResponse(
  rawText: string,
  options: {
    retrievedRecords: KnowledgeRecord[];
    confidence: RetrievalConfidence;
    fallbackLanguage: "ar" | "en" | "mixed";
    provider: "gemini" | "openai";
    model: string;
  }
): SchemaValidationOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonString(rawText));
  } catch {
    return { ok: false, error: "Response is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Response payload is not a JSON object." };
  }

  const obj = parsed as Record<string, unknown>;
  const answerObj =
    obj.answer && typeof obj.answer === "object"
      ? (obj.answer as Record<string, unknown>)
      : null;

  const summary = sanitizePlainText(answerObj?.summary ?? obj.answer);
  const rawBlocks = Array.isArray(answerObj?.blocks) ? answerObj!.blocks : [];

  if (!summary && rawBlocks.length === 0) {
    return { ok: false, error: "Missing `answer.summary` and `answer.blocks`." };
  }

  const validBlocks: RichResponseBlock[] = [];
  for (const b of rawBlocks) {
    const clean = validateSingleBlock(b);
    if (clean) validBlocks.push(clean);
  }

  // If the model provided blocks array but none were valid (e.g. wrong schema shape), reject
  if (rawBlocks.length > 0 && validBlocks.length === 0) {
    return { ok: false, error: "No valid response blocks passed schema validation." };
  }

  const allowedById = new Map<string, KnowledgeRecord>(
    options.retrievedRecords.map((r) => [r.id, r])
  );

  // Server-side citation verification: filter only records actually present in retrievedRecords
  const rawSources = Array.isArray(obj.sources) ? obj.sources : [];
  const verifiedSources: VerifiedSourceReference[] = [];
  const seenIds = new Set<string>();

  for (const s of rawSources) {
    if (!s || typeof s !== "object") continue;
    const srcObj = s as Record<string, unknown>;
    const rid = sanitizePlainText(srcObj.recordId);
    const matched = rid ? allowedById.get(rid) : undefined;
    if (matched && !seenIds.has(matched.id)) {
      seenIds.add(matched.id);
      verifiedSources.push(toVerifiedSourceReference(matched));
    }
  }

  // If model returned valid answers grounded in context without echoing sources[], attach backend sources
  if (verifiedSources.length === 0 && options.retrievedRecords.length > 0 && options.confidence !== "none") {
    for (const rec of options.retrievedRecords.slice(0, 4)) {
      if (!seenIds.has(rec.id)) {
        seenIds.add(rec.id);
        verifiedSources.push(toVerifiedSourceReference(rec));
      }
    }
  }

  // Clean inline source_list blocks so hallucinated recordIds are removed there too
  const sanitizedBlocks = validBlocks
    .map((block): RichResponseBlock | null => {
      if (block.type !== "source_list") return block;
      const checkedItems = block.items
        .filter((item) => (item.recordId ? allowedById.has(item.recordId) : false))
        .map((item) => toVerifiedSourceReference(allowedById.get(item.recordId!)!));
      if (checkedItems.length > 0) {
        return { ...block, items: checkedItems };
      }
      if (verifiedSources.length > 0) {
        return {
          ...block,
          items: verifiedSources,
        };
      }
      return null;
    })
    .filter((b): b is RichResponseBlock => b !== null);

  if (sanitizedBlocks.length === 0 && summary) {
    sanitizedBlocks.push({ type: "paragraph", text: summary, tone: "default" });
  }

  const lang =
    obj.language === "ar" || obj.language === "en" || obj.language === "mixed"
      ? obj.language
      : options.fallbackLanguage;

  let status: AIResponseStatus =
    obj.status === "success" ||
    obj.status === "partial" ||
    obj.status === "clarification" ||
    obj.status === "not_found"
      ? obj.status
      : options.confidence === "none"
      ? "not_found"
      : options.confidence === "ambiguous"
      ? "clarification"
      : options.confidence === "partial"
      ? "partial"
      : "success";

  // Never allow model to claim full success if backend retrieval found nothing
  if (options.confidence === "none" && status === "success") {
    status = "not_found";
  }

  return {
    ok: true,
    response: {
      schemaVersion: "1.0",
      language: lang,
      status,
      answer: {
        summary: summary || (sanitizedBlocks[0]?.type === "paragraph" ? sanitizedBlocks[0].text : ""),
        blocks: sanitizedBlocks,
      },
      sources: verifiedSources,
      meta: {
        provider: options.provider,
        model: options.model,
        // Never trust the model's `grounded` boolean without backend verified sources
        grounded: verifiedSources.length > 0 && options.confidence !== "none",
      },
    },
  };
}

/** Deterministically serialize RichAIResponse into readable Markdown/text for clipboard copy, previews & tests. */
export function richResponseToMarkdown(rich: RichAIResponse): string {
  const parts: string[] = [];
  if (rich.answer.summary) {
    parts.push(rich.answer.summary);
  }

  for (const b of rich.answer.blocks) {
    switch (b.type) {
      case "heading":
        parts.push(`${"#".repeat(b.level)} ${b.text}`);
        break;
      case "paragraph":
        if (b.text !== rich.answer.summary) {
          parts.push(b.text);
        }
        break;
      case "list":
        parts.push(
          (b.title ? `**${b.title}**\n` : "") +
            b.items
              .map((item, idx) =>
                b.style === "numbered" ? `${idx + 1}. ${item}` : `- ${item}`
              )
              .join("\n")
        );
        break;
      case "table": {
        const header = `| ${b.columns.map((c) => c.label).join(" | ")} |`;
        const sep = `| ${b.columns.map(() => "---").join(" | ")} |`;
        const rows = b.rows.map(
          (r) => `| ${b.columns.map((c) => r[c.key] || "—").join(" | ")} |`
        );
        parts.push(
          [b.title ? `**${b.title}**` : "", header, sep, ...rows]
            .filter(Boolean)
            .join("\n")
        );
        break;
      }
      case "metric":
        parts.push(
          `- **${b.label}:** ${b.value}${b.calculationNote ? ` *(${b.calculationNote})*` : ""}`
        );
        break;
      case "badge":
        parts.push(`[${b.label}]`);
        break;
      case "callout":
        parts.push(`> **${b.title || b.tone.toUpperCase()}:** ${b.text}`);
        break;
      case "quote":
        parts.push(`> "${b.text}"${b.citation ? ` — ${b.citation}` : ""}`);
        break;
      case "divider":
        parts.push("---");
        break;
      case "source_list":
        parts.push(
          `**${b.title || "Sources"}:** ` +
            b.items
              .map(
                (i) =>
                  `${i.title || i.fileName} (${i.sheetName || ""}${i.rowNumber ? ` R${i.rowNumber}` : ""})`
              )
              .join("; ")
        );
        break;
    }
  }

  return parts.filter(Boolean).join("\n\n");
}

/** Map backend-verified retrieval sources into UI MessageSource[] pills cleanly. */
export function mapConfidenceFromStatus(status: AIResponseStatus): RetrievalConfidence {
  switch (status) {
    case "not_found":
      return "none";
    case "clarification":
      return "ambiguous";
    case "partial":
      return "partial";
    default:
      return "strong";
  }
}

export function mergeVerifiedMessageSources(
  pkgSources: MessageSource[],
  verifiedRefs: VerifiedSourceReference[],
  retrievedRecords: KnowledgeRecord[]
): MessageSource[] {
  if (pkgSources.length > 0) return pkgSources;
  const byId = new Map(retrievedRecords.map((r) => [r.id, r]));
  return verifiedRefs.map((ref) => {
    const rec = byId.get(ref.recordId);
    return {
      category: rec?.category || "knowledge",
      title: rec?.name || ref.title || ref.recordId,
      type: "knowledge",
      file: ref.fileName,
      sheet: ref.sheetName,
      rawSheet: ref.rawSheet,
      row: ref.rowNumber,
      rows: rec?.source.rows || [ref.rowNumber],
      cell: ref.cell,
      cellRange: ref.cellRange,
      url: ref.sourceUrl,
      hasSheetGid: ref.hasSheetGid,
    };
  });
}
