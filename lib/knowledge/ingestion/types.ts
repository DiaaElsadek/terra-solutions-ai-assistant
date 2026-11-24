/**
 * Modular, extensible knowledge ingestion contracts.
 * Pipeline: Source File -> Parser -> Normalizer -> Validator -> Canonical Records -> Knowledge Index
 *
 * NOTE: Runtime execution supports JSON, CSV, and plain text ingestion in pure Node.js
 * and tracks source manifests cleanly. Binary workbooks (.xlsx) use `scripts/build-knowledge.py`,
 * while future PDF/DOCX adapters can register parsers via `registerParser()`.
 */

import type {
  IngestionFileType,
  KnowledgeCategory,
  KnowledgeConflict,
  KnowledgeRecord,
  KnowledgeRecordStatus,
  KnowledgeSourceManifest,
} from "@/types/knowledge";

export interface RawIngestionDocument {
  fileName: string;
  fileType: IngestionFileType;
  rawContent: string;
  version?: number;
  defaultCategory?: KnowledgeCategory;
  importDate?: string;
}

export interface ParsedIngestionItem {
  name: string;
  nameAr?: string;
  nameEn?: string;
  category: KnowledgeCategory;
  sheetName: string;
  rowNumber: number;
  description: string;
  aliases?: string[];
  attributes?: Record<string, string>;
  prices?: Array<{ amount?: number; currency?: string; unit?: string; note: string }>;
  clinicIds?: string[];
}

export interface SourceParser {
  supportedTypes: IngestionFileType[];
  parse(doc: RawIngestionDocument): ParsedIngestionItem[];
}

export interface IngestionOutcome {
  manifest: KnowledgeSourceManifest;
  addedRecords: KnowledgeRecord[];
  duplicateIds: string[];
  conflicts: KnowledgeConflict[];
  validationIssues: string[];
}

export interface IngestionStoreState {
  sources: Map<string, KnowledgeSourceManifest>;
  records: KnowledgeRecord[];
  conflicts: KnowledgeConflict[];
  statusOverrides: Map<string, KnowledgeRecordStatus>;
}

