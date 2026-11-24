/**
 * Server-side knowledge access helpers.
 * Re-exports canonical records, categories, and sanitized marketing summaries.
 */

export {
  getCanonicalRecords as getKnowledgeRecords,
  getCanonicalClinics,
  getCanonicalConflicts,
} from "./server-store";
export {
  getPublicCategorySummaries as getKnowledgeCategories,
  getPublicClinicSummaries,
  getPublicDatasetOverview,
} from "./public-summary";
export { knowledgeRetriever } from "./retriever";
