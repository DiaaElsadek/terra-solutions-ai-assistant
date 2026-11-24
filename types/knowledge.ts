/** Available knowledge categories derived from the Excel data sheets. */
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
  | "dental";

/** A normalized knowledge record extracted from the company data. */
export interface KnowledgeRecord {
  /** Stable identifier (category + index). */
  id: string;
  /** Primary category. */
  category: KnowledgeCategory;
  /** Optional sub-category (e.g., "Juvederm" under "fillers"). */
  subcategory?: string;
  /** Record title — product name, treatment name, etc. */
  title: string;
  /** English title if different from the primary title. */
  titleEn?: string;
  /** Full content — may contain Markdown-like formatting. */
  content: string;
  /** Searchable tags extracted from the content. */
  tags: string[];
  /** Primary language of the content. */
  language: "ar" | "en" | "mixed";
  /** Source attribution. */
  source: {
    /** Original Excel sheet name. */
    sheet: string;
    /** Row range in the original data [start, end]. */
    rowRange: [number, number];
  };
  /** Optional structured metadata (e.g., country, price, duration). */
  metadata?: Record<string, string>;
}

/** A search result with relevance scoring. */
export interface SearchResult {
  /** The matched knowledge record. */
  record: KnowledgeRecord;
  /** Relevance score (higher is better). */
  score: number;
  /** Which fields matched the query. */
  matchedFields: string[];
}

/** Options for filtering knowledge search. */
export interface SearchOptions {
  /** Restrict search to a specific category. */
  category?: KnowledgeCategory;
  /** Maximum number of results to return. Defaults to 10. */
  limit?: number;
  /** Filter by content language. Defaults to 'all'. */
  language?: "ar" | "en" | "all";
}

/** Display metadata for a knowledge category. */
export interface KnowledgeCategoryInfo {
  /** Category identifier. */
  id: KnowledgeCategory;
  /** Arabic display name. */
  nameAr: string;
  /** English display name. */
  nameEn: string;
  /** Short description. */
  description: string;
  /** Lucide icon name. */
  icon: string;
  /** Number of records in this category. */
  recordCount: number;
}

