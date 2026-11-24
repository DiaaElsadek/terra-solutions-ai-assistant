/**
 * Runtime schema validator for the canonical knowledge dataset.
 * Ensures zero malformed records, valid source provenance, and unique IDs.
 */

import type {
  CanonicalKnowledgeDataset,
  KnowledgeRecord,
  KnowledgeCategory,
  KnowledgeRecordType,
} from "@/types/knowledge";

const VALID_CATEGORIES = new Set<KnowledgeCategory>([
  "fillers",
  "botox",
  "threads",
  "body-fillers",
  "laser",
  "hair-treatments",
  "face-treatments",
  "skin-boosters",
  "facial",
  "tattoo-removal",
  "pregnancy-safety",
  "slimming",
  "facial-machines",
  "dental",
  "clinics",
]);

const VALID_RECORD_TYPES = new Set<KnowledgeRecordType>([
  "product",
  "service",
  "device",
  "clinic",
  "safety-rule",
  "comparison",
  "policy",
  "overview",
]);

export interface ValidationIssue {
  recordId?: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  recordCount: number;
  issues: ValidationIssue[];
}

export function validateKnowledgeRecord(
  rec: Partial<KnowledgeRecord>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = rec.id || "(missing-id)";

  if (!rec.id || typeof rec.id !== "string") {
    issues.push({ recordId: id, field: "id", message: "Missing or non-string id" });
  }
  if (!rec.name || typeof rec.name !== "string") {
    issues.push({ recordId: id, field: "name", message: "Missing name" });
  }
  if (!rec.description || typeof rec.description !== "string") {
    issues.push({ recordId: id, field: "description", message: "Missing description" });
  }
  if (!rec.category || !VALID_CATEGORIES.has(rec.category)) {
    issues.push({
      recordId: id,
      field: "category",
      message: `Invalid category: ${String(rec.category)}`,
    });
  }
  if (!rec.recordType || !VALID_RECORD_TYPES.has(rec.recordType)) {
    issues.push({
      recordId: id,
      field: "recordType",
      message: `Invalid recordType: ${String(rec.recordType)}`,
    });
  }
  if (!rec.source || !rec.source.file || !rec.source.sheet) {
    issues.push({
      recordId: id,
      field: "source",
      message: "Missing source file or sheet provenance",
    });
  } else if (
    typeof rec.source.row !== "number" ||
    rec.source.row < 0 ||
    !Array.isArray(rec.source.rows) ||
    rec.source.rows.length === 0
  ) {
    issues.push({
      recordId: id,
      field: "source.rows",
      message: "Invalid row provenance",
    });
  }
  if (!Array.isArray(rec.tags)) {
    issues.push({ recordId: id, field: "tags", message: "tags must be an array" });
  }
  if (!Array.isArray(rec.aliases)) {
    issues.push({ recordId: id, field: "aliases", message: "aliases must be an array" });
  }
  if (!Array.isArray(rec.clinicIds)) {
    issues.push({ recordId: id, field: "clinicIds", message: "clinicIds must be an array" });
  }
  if (!Array.isArray(rec.prices)) {
    issues.push({ recordId: id, field: "prices", message: "prices must be an array" });
  }

  return issues;
}

export function validateCanonicalDataset(
  dataset: CanonicalKnowledgeDataset
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seenIds = new Set<string>();

  if (!dataset || !Array.isArray(dataset.records)) {
    return {
      valid: false,
      recordCount: 0,
      issues: [{ field: "records", message: "Dataset records array is missing" }],
    };
  }

  for (const record of dataset.records) {
    if (seenIds.has(record.id)) {
      issues.push({
        recordId: record.id,
        field: "id",
        message: `Duplicate record id: ${record.id}`,
      });
    }
    seenIds.add(record.id);
    issues.push(...validateKnowledgeRecord(record));
  }

  if (!Array.isArray(dataset.clinics) || dataset.clinics.length === 0) {
    issues.push({
      field: "clinics",
      message: "Canonical clinics array must not be empty",
    });
  }

  return {
    valid: issues.length === 0,
    recordCount: dataset.records.length,
    issues,
  };
}

