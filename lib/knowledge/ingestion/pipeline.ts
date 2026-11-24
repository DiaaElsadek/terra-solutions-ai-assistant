/**
 * Modular Knowledge Ingestion Pipeline:
 * Source File -> Parser -> Normalizer -> Validator -> Canonical Records -> Knowledge Index
 *
 * Supports:
 * - Approved `.json`, `.csv`, and `.txt` ingestion in runtime TS without third-party dependencies.
 * - Pluggable parser registry for future `.xlsx`, `.xls`, `.pdf`, `.docx` adapters.
 * - Duplicate detection, price/attribute conflict flagging, source deactivation, and index callbacks.
 */

import type {
  IngestionFileType,
  KnowledgeCategory,
  KnowledgeConflict,
  KnowledgeRecord,
  KnowledgeSourceManifest,
} from "@/types/knowledge";
import { validateKnowledgeRecord } from "@/lib/knowledge/validator";
import { detectLanguage, normalizeText } from "@/lib/knowledge/normalize";
import type {
  IngestionOutcome,
  ParsedIngestionItem,
  RawIngestionDocument,
  SourceParser,
} from "./types";

function slugifyId(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item"
  );
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const jsonParser: SourceParser = {
  supportedTypes: ["json"],
  parse(doc: RawIngestionDocument): ParsedIngestionItem[] {
    const parsed = JSON.parse(doc.rawContent) as unknown;
    const rows: Array<Record<string, unknown>> = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" && parsed !== null && Array.isArray((parsed as { records?: unknown }).records)
      ? ((parsed as { records: Array<Record<string, unknown>> }).records)
      : [];

    return rows
      .filter((r) => typeof r.name === "string" || typeof r.title === "string")
      .map((r, idx) => ({
        name: String(r.name || r.title),
        nameAr: typeof r.nameAr === "string" ? r.nameAr : undefined,
        nameEn: typeof r.nameEn === "string" ? r.nameEn : undefined,
        category: (r.category as KnowledgeCategory) || doc.defaultCategory || "facial",
        sheetName: typeof r.sheet === "string" ? r.sheet : "json-import",
        rowNumber: typeof r.row === "number" ? r.row : idx + 1,
        description: String(r.description || r.content || r.name || r.title),
        aliases: Array.isArray(r.aliases) ? r.aliases.map(String) : undefined,
        attributes:
          typeof r.attributes === "object" && r.attributes !== null
            ? Object.fromEntries(
                Object.entries(r.attributes as Record<string, unknown>).map(([k, v]) => [k, String(v)])
              )
            : undefined,
      }));
  },
};

const csvParser: SourceParser = {
  supportedTypes: ["csv"],
  parse(doc: RawIngestionDocument): ParsedIngestionItem[] {
    const lines = doc.rawContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
    const nameIdx = Math.max(0, headers.findIndex((h) => h.includes("name") || h.includes("title")));
    const descIdx = headers.findIndex((h) => h.includes("desc") || h.includes("note") || h.includes("content"));

    return lines.slice(1).map((line, i) => {
      const cols = parseCsvLine(line);
      const attrs: Record<string, string> = {};
      headers.forEach((h, colIdx) => {
        if (cols[colIdx] && colIdx !== nameIdx && colIdx !== descIdx) {
          attrs[h || `col_${colIdx + 1}`] = cols[colIdx];
        }
      });
      const name = cols[nameIdx] || `Row ${i + 2}`;
      const desc =
        (descIdx >= 0 && cols[descIdx]) ||
        Object.entries(attrs)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n") ||
        name;

      return {
        name,
        category: doc.defaultCategory || "facial",
        sheetName: doc.fileName,
        rowNumber: i + 2,
        description: desc,
        attributes: attrs,
      };
    });
  },
};

const txtParser: SourceParser = {
  supportedTypes: ["txt"],
  parse(doc: RawIngestionDocument): ParsedIngestionItem[] {
    const sections = doc.rawContent
      .split(/\r?\n\s*\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return sections.map((section, idx) => {
      const firstLine = section.split(/\r?\n/)[0]?.slice(0, 80) || `Section ${idx + 1}`;
      return {
        name: firstLine,
        category: doc.defaultCategory || "facial",
        sheetName: doc.fileName,
        rowNumber: idx + 1,
        description: section,
      };
    });
  },
};

export class KnowledgeIngestionPipeline {
  private parsers = new Map<IngestionFileType, SourceParser>();
  private manifests = new Map<string, KnowledgeSourceManifest>();
  private recordsById = new Map<string, KnowledgeRecord>();
  private onRebuildIndex?: () => void;

  constructor(
    initialManifests: KnowledgeSourceManifest[] = [],
    initialRecords: KnowledgeRecord[] = [],
    onRebuildIndex?: () => void
  ) {
    this.registerParser(jsonParser);
    this.registerParser(csvParser);
    this.registerParser(txtParser);
    this.onRebuildIndex = onRebuildIndex;

    for (const m of initialManifests) {
      this.manifests.set(m.sourceId, m);
    }
    for (const r of initialRecords) {
      this.recordsById.set(r.id, r);
    }
  }

  registerParser(parser: SourceParser): void {
    for (const ft of parser.supportedTypes) {
      this.parsers.set(ft, parser);
    }
  }

  listManifests(): KnowledgeSourceManifest[] {
    return Array.from(this.manifests.values());
  }

  getActiveRecords(): KnowledgeRecord[] {
    return Array.from(this.recordsById.values()).filter((r) => {
      const recStatus = r.status ?? "active";
      if (recStatus !== "active") return false;
      const manifestStatus = r.source.sourceId
        ? this.manifests.get(r.source.sourceId)?.status
        : "active";
      return manifestStatus !== "inactive" && manifestStatus !== "archived";
    });
  }

  deactivateSource(sourceId: string): boolean {
    const existing = this.manifests.get(sourceId);
    if (!existing) return false;
    this.manifests.set(sourceId, { ...existing, status: "inactive" });
    for (const [id, rec] of this.recordsById.entries()) {
      if (rec.source.sourceId === sourceId) {
        this.recordsById.set(id, { ...rec, status: "inactive" });
      }
    }
    this.onRebuildIndex?.();
    return true;
  }

  ingestSource(doc: RawIngestionDocument): IngestionOutcome {
    const parser = this.parsers.get(doc.fileType);
    if (!parser) {
      throw new Error(
        `No runtime parser registered for "${doc.fileType}". Use scripts/build-knowledge.py for Excel workbooks or register a parser adapter.`
      );
    }

    const importDate = doc.importDate || new Date().toISOString();
    const sourceId = `src-${slugifyId(doc.fileName)}-${Date.now()}`;
    const parsedItems = parser.parse(doc);

    const addedRecords: KnowledgeRecord[] = [];
    const duplicateIds: string[] = [];
    const conflicts: KnowledgeConflict[] = [];
    const validationIssues: string[] = [];

    for (const item of parsedItems) {
      const candidateId = `${slugifyId(item.category)}-${slugifyId(item.name)}`;
      const existing = this.recordsById.get(candidateId);

      const rec: KnowledgeRecord = {
        id: existing ? `${candidateId}-v${doc.version ?? 1}-${item.rowNumber}` : candidateId,
        recordType: "service",
        category: item.category,
        name: item.name,
        title: item.name,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        aliases: item.aliases || [item.name],
        description: item.description,
        content: item.description,
        attributes: item.attributes || {},
        prices: item.prices || [],
        offers: [],
        clinicIds: item.clinicIds || [],
        source: {
          sourceId,
          file: doc.fileName,
          sheet: item.sheetName,
          row: item.rowNumber,
          rows: [item.rowNumber],
        },
        sourceType: "consolidated",
        confidence: "high",
        tags: Array.from(new Set(normalizeText(item.name).split(" ").filter(Boolean))),
        language: detectLanguage(`${item.name} ${item.description}`),
        status: "active",
      };

      const issues = validateKnowledgeRecord(rec);
      if (issues.length > 0) {
        validationIssues.push(...issues.map((i) => `${i.recordId}: ${i.message}`));
        continue;
      }

      if (existing) {
        duplicateIds.push(candidateId);
        if (normalizeText(existing.description) !== normalizeText(rec.description)) {
          conflicts.push({
            id: `conflict-${candidateId}-${item.rowNumber}`,
            severity: "warning",
            topic: item.name,
            description: `New source "${doc.fileName}" R${item.rowNumber} differs from existing record "${existing.name}" (${existing.source.file} R${existing.source.row}). Preserved both without silent overwrite.`,
            sources: [existing.source, rec.source],
          });
        }
      }

      this.recordsById.set(rec.id, rec);
      addedRecords.push(rec);
    }

    const manifest: KnowledgeSourceManifest = {
      sourceId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      status: "active",
      version: doc.version ?? 1,
      importDate,
      rowCount: addedRecords.length,
    };

    this.manifests.set(sourceId, manifest);
    this.onRebuildIndex?.();

    return {
      manifest,
      addedRecords,
      duplicateIds,
      conflicts,
      validationIssues,
    };
  }
}

