/** Canonical knowledge categories derived from Terra Solutions' Excel workbook and clinics list. */
export type KnowledgeCategory =
  | "fillers"
  | "botox"
  | "threads"
  | "body-fillers"
  | "laser"
  | "hair-treatments"
  | "face-treatments"
  | "skin-boosters"
  | "facial"
  | "tattoo-removal"
  | "pregnancy-safety"
  | "slimming"
  | "facial-machines"
  | "dental"
  | "clinics";

/** Semantic type of a canonical knowledge record. */
export type KnowledgeRecordType =
  | "product"
  | "service"
  | "device"
  | "clinic"
  | "safety-rule"
  | "comparison"
  | "policy"
  | "overview";

/** Status lifecycle of a source or canonical knowledge record. */
export type KnowledgeRecordStatus = "active" | "inactive" | "archived";

/** Supported ingestion source formats. */
export type IngestionFileType =
  | "xlsx"
  | "xls"
  | "csv"
  | "json"
  | "txt"
  | "pdf"
  | "docx";

/** Manifest describing an approved source file in the canonical knowledge base. */
export interface KnowledgeSourceManifest {
  sourceId: string;
  fileName: string;
  fileType: IngestionFileType;
  status: KnowledgeRecordStatus;
  version: number;
  importDate: string;
  rowCount?: number;
}

/** High-level metadata for the consolidated canonical knowledge base. */
export interface KnowledgeBaseMetadata {
  id: string;
  name: string;
  language: string[];
  lastUpdated: string;
  sources: KnowledgeSourceManifest[];
}

/** Exact provenance pointer back to the original company source file. */
export interface KnowledgeSourceRef {
  /** Stable identifier linking to `knowledgeBase.sources`. */
  sourceId?: string;
  /** Source filename (e.g., "Knowlege.xlsx" or "clinics.json"). */
  file: string;
  /** Human-readable sheet or section name. */
  sheet: string;
  /** Exact worksheet name in the Excel workbook (may include trailing spaces). */
  rawSheet?: string;
  /** Primary 1-based Excel row number (0 for non-tabular JSON like clinics.json). */
  row: number;
  /** Exact list of 1-based Excel rows contributing to this record. */
  rows: number[];
}

/** Structured pricing entry extracted without fabrication. */
export interface PriceItem {
  amount?: number;
  currency?: string;
  unit?: string;
  note: string;
}

/** Documented data conflict or copy-paste contradiction detected in source files. */
export interface KnowledgeConflict {
  id: string;
  severity: "warning" | "error";
  topic: string;
  description: string;
  sources: KnowledgeSourceRef[];
}

/** Safety metadata attached to treatments/products when verified in source data. */
export interface SafetyFlags {
  pregnancyAllowed?: boolean;
  lactationAllowed?: boolean | "doctor_evaluation";
  contraindications?: string[];
  preCare?: string[];
  postCare?: string[];
}

/** Canonical validated knowledge record. */
export interface KnowledgeRecord {
  id: string;
  recordType: KnowledgeRecordType;
  category: KnowledgeCategory;
  subcategory?: string;
  /** Primary display name/title. */
  name: string;
  /** Kept for compatibility with UI components. */
  title: string;
  nameAr?: string;
  nameEn?: string;
  titleEn?: string;
  aliases: string[];
  description: string;
  /** Kept as Markdown-friendly formatted view of description + attributes. */
  content: string;
  descriptionAr?: string;
  descriptionEn?: string;
  attributes: Record<string, string>;
  prices: PriceItem[];
  offers: string[];
  clinicIds: string[];
  safetyFlags?: SafetyFlags;
  source: KnowledgeSourceRef;
  sourceType: "excel" | "clinics-json" | "consolidated";
  confidence: "high" | "medium";
  tags: string[];
  language: "ar" | "en" | "mixed";
  status?: KnowledgeRecordStatus;
  conflictNotes?: string[];
}

/** Canonical clinic entity consolidated from clinics.json + Excel sheets. */
export interface CanonicalClinic {
  id: string;
  name: string;
  aliases: string[];
  devices: Array<{ device: string; service: string; technology?: string; note?: string }>;
  services: string[];
  doctors: string[];
  notes: string[];
  missingFields: string[];
  sources: KnowledgeSourceRef[];
}

/** Retrieval confidence tier calibrated across queries. */
export type RetrievalConfidence = "strong" | "partial" | "ambiguous" | "none";

/** Search result with explainable match breakdown. */
export interface SearchResult {
  record: KnowledgeRecord;
  score: number;
  matchedFields: string[];
  matchReasons: string[];
  relatedIds?: string[];
}

/** Options for filtering knowledge search. */
export interface SearchOptions {
  category?: KnowledgeCategory;
  recordType?: KnowledgeRecordType;
  clinicId?: string;
  limit?: number;
  language?: "ar" | "en" | "all";
  includeInactive?: boolean;
}

/** Display metadata for a knowledge category. */
export interface KnowledgeCategoryInfo {
  id: KnowledgeCategory;
  nameAr: string;
  nameEn: string;
  description: string;
  icon: string;
  recordCount: number;
}

/** Full canonical dataset bundle stored in data/canonical/knowledge.canonical.json. */
export interface CanonicalKnowledgeDataset {
  schemaVersion?: string;
  version: string;
  generatedAt: string;
  knowledgeBase?: KnowledgeBaseMetadata;
  sources: string[];
  records: KnowledgeRecord[];
  clinics: CanonicalClinic[];
  conflicts: KnowledgeConflict[];
  stats: {
    excelSheets: number;
    excelNonEmptyRows: number;
    excelNonWhitespaceCells: number;
    canonicalRecords: number;
    clinicsCount: number;
    conflictsCount: number;
  };
}
