/**
 * Public facade for server-side knowledge retrieval.
 * Delegates to the pre-indexed modular KnowledgeRetriever pipeline.
 */

export {
  knowledgeRetriever as knowledgeEngine,
  knowledgeRetriever,
  KnowledgeRetriever,
  type RetrievalOutput,
} from "./retriever";
export { normalizeText, detectLanguage, tokenizeQuery } from "./normalize";
export { classifyQuery, type QueryIntent, type ClassifiedQuery } from "./intent";
export { expandSynonyms } from "./synonyms";
export {
  resolveContextualQuery,
  type ConversationTurn,
  type ContextualQueryResult,
} from "./context-query";
export { KnowledgeIngestionPipeline } from "./ingestion/pipeline";
export type {
  RawIngestionDocument,
  ParsedIngestionItem,
  SourceParser,
  IngestionOutcome,
} from "./ingestion/types";
export { validateCanonicalDataset, validateKnowledgeRecord } from "./validator";
export {
  getCanonicalDataset,
  getCanonicalRecords,
  getCanonicalClinics,
  getCanonicalConflicts,
} from "./server-store";
