/**
 * Entity-aware and intent-scoped query expander.
 * Preserves the original employee query untouched while producing controlled normalized
 * search tokens, phonetic/typo corrections, and detected canonical entity hints.
 */

import { normalizeText, tokenizeQuery } from "./normalize";
import { classifyQuery, type ClassifiedQuery } from "./intent";
import {
  expandSynonyms,
  matchUnsupportedCompound,
  resolveCanonicalEntities,
  type EntityMatchHint,
  type UnsupportedCompoundGuard,
} from "./synonyms";

export interface ExpandedQueryPlan {
  rawQuery: string;
  normalizedQuery: string;
  classified: ClassifiedQuery;
  primaryTokens: string[];
  expandedTokens: string[];
  entityHints: EntityMatchHint[];
  unsupportedCompound: UnsupportedCompoundGuard | null;
  comparisonClauses?: [string, string];
}

/** Extract left/right comparison targets from English & Arabic comparison questions cleanly. */
function extractComparisonSides(normalized: string): [string, string] | undefined {
  const patterns = [
    /(?:الفرق\s+بين|مقارنه?\s+بين|قارن\s+بين)\s+(.+?)\s+(?:و|vs\.?|versus|and)\s+(.+?)(?:[؟?!.]|$)/i,
    /(?:difference\s+between|compare)\s+(.+?)\s+(?:and|vs\.?|versus|و)\s+(.+?)(?:[؟?!.]|$)/i,
    /^(?:مقارنه?\s+بين\s+)?(.+?)\s+(?:ولا|or)\s+(.+?)\s+(?:احسن|افضل|better).*$/i,
    /^(.+?)\s+(?:ولا)\s+(.+?)(?:\s+(?:احسن|افضل))?(?:[؟?!.]|$)/i,
    /^(.+?)\s+(?:vs\.?|versus)\s+(.+?)(?:[؟?!.]|$)/i,
  ];
  for (const re of patterns) {
    const m = normalized.match(re);
    if (m?.[1] && m?.[2]) {
      const left = m[1].trim();
      const right = m[2].trim();
      if (left.length >= 2 && right.length >= 2) {
        return [left, right];
      }
    }
  }
  return undefined;
}

export function buildExpandedQueryPlan(rawQuery: string): ExpandedQueryPlan {
  const normalizedQuery = normalizeText(rawQuery);
  const classified = classifyQuery(rawQuery);
  const primaryTokens = tokenizeQuery(rawQuery);
  const unsupportedCompound = matchUnsupportedCompound(normalizedQuery);
  const entityHints = unsupportedCompound
    ? []
    : resolveCanonicalEntities(primaryTokens, normalizedQuery);

  // Scoped synonym expansion from primary tokens + resolved entity aliases
  const baseExpanded = unsupportedCompound ? [] : expandSynonyms(primaryTokens);
  const expandedSet = new Set<string>(baseExpanded);

  for (const hint of entityHints) {
    const cleanMatch = normalizeText(hint.matchedTerm);
    if (cleanMatch && !primaryTokens.includes(cleanMatch)) {
      expandedSet.add(cleanMatch);
    }
  }

  const comparisonClauses = classified.asksComparison
    ? extractComparisonSides(normalizedQuery)
    : undefined;

  return {
    rawQuery,
    normalizedQuery,
    classified,
    primaryTokens,
    expandedTokens: Array.from(expandedSet),
    entityHints,
    unsupportedCompound,
    comparisonClauses,
  };
}

