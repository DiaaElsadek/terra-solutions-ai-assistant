/**
 * Knowledge data loader and normalizer export.
 * Exposes validated categories and parsed records from the supplied Excel JSON.
 */

import rawKnowledgeData from "@/public/data/knowledge.json";
import { knowledgeEngine } from "./index";
import type { KnowledgeCategoryInfo, KnowledgeRecord } from "@/types/knowledge";

/** Get all normalized knowledge records. */
export function getKnowledgeRecords(): KnowledgeRecord[] {
  return knowledgeEngine.getAllRecords();
}

/** Get categories enriched with live record counts. */
export function getKnowledgeCategories(): KnowledgeCategoryInfo[] {
  return knowledgeEngine.getCategoriesWithCounts();
}

/** Get total sheet count in the supplied knowledge JSON. */
export function getKnowledgeSheetCount(): number {
  return Object.keys(rawKnowledgeData).length;
}

