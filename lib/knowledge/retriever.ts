/**
 * Pre-indexed bilingual knowledge retrieval engine.
 *
 * Implements:
 *   Query -> Normalization -> Language Detection -> Intent Recognition
 *   -> Synonym Expansion -> Candidate Retrieval -> Multi-Signal Scoring
 *   -> Confidence & Ambiguity Assessment -> Related Record Expansion
 */

import type {
  KnowledgeRecord,
  KnowledgeCategory,
  KnowledgeCategoryInfo,
  CanonicalClinic,
  KnowledgeConflict,
  RetrievalConfidence,
  SearchOptions,
  SearchResult,
} from "@/types/knowledge";
import { CATEGORIES } from "./categories";
import { getCanonicalDataset } from "./server-store";
import { normalizeText, tokenizeQuery, type QueryLanguage } from "./normalize";
import { expandSynonyms, getTokenSynonyms } from "./synonyms";
import { classifyQuery, type ClassifiedQuery } from "./intent";

interface IndexedRecord {
  record: KnowledgeRecord;
  nameNorm: string;
  nameEnNorm: string;
  nameArNorm: string;
  aliasesNorm: string[];
  tagsNorm: string[];
  attrsNorm: string;
  descNorm: string;
  catNorm: string;
  latinWords: string[];
}

export interface RetrievalOutput {
  classified: ClassifiedQuery;
  primaryTokens: string[];
  expandedTokens: string[];
  results: SearchResult[];
  confidence: RetrievalConfidence;
  requiresClarification: boolean;
  clarificationCandidates: KnowledgeRecord[];
  relatedRecords: KnowledgeRecord[];
  conflicts: KnowledgeConflict[];
  missingIndicators: string[];
}

const GENERIC_MODIFIER_TOKENS = new Set([
  "pro", "max", "plus", "ultra", "neo", "mini", "new", "day", "one", "old",
  "version", "edition", "original", "classic", "vip", "100", "200", "500", "10",
  "machine", "machines", "device", "devices", "clinic", "clinics", "treatment",
  "treatments", "session", "sessions", "patient", "today", "take", "severe",
  "احدث", "اصدار", "جهاز", "اجهزه", "عياده", "عيادات",
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesToken(text: string, token: string): boolean {
  if (!text || !token) return false;
  if (/^[a-z0-9+.-]+$/.test(token) && token.length <= 4) {
    return new RegExp(`(^|[^a-z0-9-])${escapeRegExp(token)}([^a-z0-9-]|$)`).test(
      text
    );
  }
  return text.includes(token);
}

/** Standard Levenshtein edit distance for controlled typo recovery. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  return dp[n];
}

function isFuzzyTokenMatch(token: string, words: string[]): boolean {
  if (token.length < 5 || !/^[a-z]+$/.test(token)) return false;
  const maxDist = token.length >= 8 ? 2 : 1;
  for (const w of words) {
    if (Math.abs(w.length - token.length) > maxDist) continue;
    if (levenshtein(token, w) <= maxDist) return true;
  }
  return false;
}

export class KnowledgeRetriever {
  private index: IndexedRecord[] = [];
  private recordById = new Map<string, KnowledgeRecord>();
  private clinics: CanonicalClinic[] = [];
  private conflicts: KnowledgeConflict[] = [];
  private initialized = false;

  private ensureInit(): void {
    if (this.initialized) return;
    const dataset = getCanonicalDataset();
    this.clinics = dataset.clinics;
    this.conflicts = dataset.conflicts;

    this.index = dataset.records.map((record) => {
      const catInfo = CATEGORIES[record.category];
      const nameNorm = normalizeText(record.name);
      const nameEnNorm = record.nameEn ? normalizeText(record.nameEn) : "";
      const nameArNorm = record.nameAr ? normalizeText(record.nameAr) : "";
      const aliasesNorm = record.aliases.map((a) => normalizeText(a));
      const tagsNorm = record.tags.map((t) => normalizeText(t));
      const attrsNorm = normalizeText(Object.values(record.attributes).join(" "));
      const descNorm = normalizeText(record.description);
      const catNorm = catInfo
        ? normalizeText(`${catInfo.nameAr} ${catInfo.nameEn} ${catInfo.description}`)
        : "";
      const latinPool = `${nameNorm} ${aliasesNorm.join(" ")} ${tagsNorm.join(" ")}`;
      const latinWords = Array.from(new Set(latinPool.match(/[a-z]{5,}/g) || []));

      this.recordById.set(record.id, record);

      return {
        record,
        nameNorm,
        nameEnNorm,
        nameArNorm,
        aliasesNorm,
        tagsNorm,
        attrsNorm,
        descNorm,
        catNorm,
        latinWords,
      };
    });

    this.initialized = true;
  }

  getAllRecords(): KnowledgeRecord[] {
    this.ensureInit();
    return this.index.map((i) => i.record);
  }

  getById(id: string): KnowledgeRecord | undefined {
    this.ensureInit();
    return this.recordById.get(id);
  }

  getByCategory(category: KnowledgeCategory): KnowledgeRecord[] {
    this.ensureInit();
    return this.index
      .filter((i) => i.record.category === category)
      .map((i) => i.record);
  }

  getClinics(): CanonicalClinic[] {
    this.ensureInit();
    return this.clinics;
  }

  getConflicts(): KnowledgeConflict[] {
    this.ensureInit();
    return this.conflicts;
  }

  getCategoriesWithCounts(): KnowledgeCategoryInfo[] {
    this.ensureInit();
    const counts: Record<string, number> = {};
    for (const item of this.index) {
      counts[item.record.category] = (counts[item.record.category] || 0) + 1;
    }
    return Object.entries(CATEGORIES).map(([id, info]) => ({
      ...info,
      recordCount: counts[id] || 0,
    }));
  }

  /** Score a single indexed record and produce explainable match reasons. */
  private scoreItem(
    item: IndexedRecord,
    primaryTokens: string[],
    expandedTokens: string[],
    classified: ClassifiedQuery
  ): SearchResult | null {
    let score = 0;
    const matchedFields = new Set<string>();
    const matchReasons: string[] = [];
    const matchedTokens = new Set<string>();
    const rawNorm = classified.normalized;

    // 1. Exact full name or exact alias match (highest precision)
    if (
      rawNorm.length >= 2 &&
      (item.nameNorm === rawNorm ||
        item.nameEnNorm === rawNorm ||
        item.nameArNorm === rawNorm ||
        item.aliasesNorm.some((a) => a === rawNorm))
    ) {
      score += 42;
      matchedFields.add("exact-name");
      matchReasons.push("Exact product/service name or alias match");
    } else if (
      rawNorm.length >= 3 &&
      (item.nameNorm.includes(rawNorm) ||
        item.nameEnNorm.includes(rawNorm) ||
        item.aliasesNorm.some((a) => a.length >= 3 && a.includes(rawNorm)))
    ) {
      score += 22;
      matchedFields.add("phrase-name");
      matchReasons.push("Phrase match in title or alias");
    }

    // 2. Primary query token & per-concept synonym matches (never double-count synonyms of the same token)
    let matchedSpecificEntityTokens = 0;
    let synonymNameHit = false;
    const totalSpecificEntityTokens = primaryTokens.filter(
      (t) => !GENERIC_MODIFIER_TOKENS.has(t)
    ).length;

    for (const token of primaryTokens) {
      let bestDirectScore = 0;
      let directExtraHits = 0;
      let hitNameThisToken = false;
      let hitAliasThisToken = false;
      const isModifier = GENERIC_MODIFIER_TOKENS.has(token);
      const weightScale = isModifier ? 0.25 : 1;

      const recordFieldHit = (fieldWeight: number, fieldName: string) => {
        const w = fieldWeight * weightScale;
        if (w > bestDirectScore) {
          if (bestDirectScore > 0) directExtraHits += 1;
          bestDirectScore = w;
        } else {
          directExtraHits += 1;
        }
        matchedFields.add(fieldName);
      };

      if (matchesToken(item.nameNorm, token) || matchesToken(item.nameEnNorm, token)) {
        recordFieldHit(11, "name");
        hitNameThisToken = true;
      }

      if (item.aliasesNorm.some((a) => a === token || matchesToken(a, token))) {
        recordFieldHit(9, "alias");
        hitAliasThisToken = true;
      }

      if (item.attrsNorm && matchesToken(item.attrsNorm, token)) {
        recordFieldHit(6, "attributes");
      }

      if (item.tagsNorm.some((t) => t === token || matchesToken(t, token))) {
        recordFieldHit(5.5, "tags");
      }

      if (item.catNorm && matchesToken(item.catNorm, token)) {
        recordFieldHit(4, "category");
      }

      if (matchesToken(item.descNorm, token)) {
        recordFieldHit(4.5, "description");
      }

      let tokenScore =
        bestDirectScore + Math.min(4.5, directExtraHits * 1.5 * weightScale);

      // Apply best single synonym bridge ONLY when this token did not already hit title/alias directly
      let bestSynScore = 0;
      let bestSynReason = "";
      let bestSynField = "";
      if (!isModifier) {
        for (const syn of getTokenSynonyms(token)) {
          if (matchesToken(item.nameNorm, syn) || matchesToken(item.nameEnNorm, syn)) {
            if (!hitNameThisToken && 12 > bestSynScore) {
              bestSynScore = 12;
              bestSynField = "synonym-name";
              bestSynReason = `Synonym match ("${syn}") in title`;
            }
          } else if (item.aliasesNorm.some((a) => matchesToken(a, syn))) {
            if (!hitAliasThisToken && 8 > bestSynScore) {
              bestSynScore = 8;
              bestSynField = "synonym-alias";
              bestSynReason = `Synonym match ("${syn}") in alias`;
            }
          } else if (item.tagsNorm.some((t) => matchesToken(t, syn))) {
            if (tokenScore === 0 && 4.5 > bestSynScore) {
              bestSynScore = 4.5;
              bestSynField = "synonym-tags";
            }
          } else if (matchesToken(item.descNorm, syn)) {
            if (tokenScore === 0 && 3 > bestSynScore) {
              bestSynScore = 3;
              bestSynField = "synonym-description";
            }
          }
        }
      }

      if (bestSynScore > 0) {
        tokenScore = Math.max(tokenScore, bestSynScore + (tokenScore > 0 ? 1.5 : 0));
        matchedFields.add(bestSynField);
        if (bestSynField === "synonym-name") {
          synonymNameHit = true;
          if (bestSynReason) matchReasons.push(bestSynReason);
        }
      } else if (tokenScore === 0 && !isModifier && isFuzzyTokenMatch(token, item.latinWords)) {
        tokenScore += 4.5;
        matchedFields.add("fuzzy");
        matchReasons.push(`Fuzzy match for "${token}"`);
      }

      if (tokenScore > 0) {
        score += tokenScore;
        matchedTokens.add(token);
        if (!isModifier) matchedSpecificEntityTokens += 1;
      }
    }

    // Reject records that matched ONLY generic modifiers (e.g. "pro", "max", "machine")
    // when the user explicitly queried specific non-modifier terms that had zero match.
    if (
      totalSpecificEntityTokens > 0 &&
      matchedSpecificEntityTokens === 0 &&
      !synonymNameHit &&
      !matchedFields.has("exact-name") &&
      !matchedFields.has("phrase-name")
    ) {
      return null;
    }

    if (score <= 0) return null;

    // 4. Query token coverage bonus (multi-term queries prefer records covering all terms)
    if (primaryTokens.length >= 2) {
      const coverage = matchedTokens.size / primaryTokens.length;
      if (coverage >= 1) {
        score += 10;
        matchReasons.push("Matches all query terms");
      } else if (coverage >= 0.5) {
        score += coverage * 6;
      }
    }

    // 5. Intent-aware relevance boosts
    const rec = item.record;
    if (
      classified.intent === "safety_pregnancy" &&
      rec.category === "pregnancy-safety"
    ) {
      score += 5;
      matchReasons.push("Matches pregnancy & lactation safety intent");
    }

    if (classified.clinicHints.length > 0) {
      if (classified.clinicHints.some((cid) => rec.clinicIds.includes(cid))) {
        score += 7;
        matchReasons.push("Linked to requested clinic");
      }
    } else if (classified.intent === "clinic_lookup" && rec.category === "clinics") {
      score += 6;
    }

    if (classified.asksPrice && rec.prices.length > 0) {
      score += 5;
      matchReasons.push("Contains verified pricing");
    }

    if (classified.asksComparison && rec.recordType === "comparison") {
      score += 8;
      matchReasons.push("Verified comparison table");
    } else if (!classified.asksComparison && rec.recordType === "comparison") {
      score -= 6;
    }

    if (
      rec.recordType === "product" ||
      rec.recordType === "device" ||
      rec.recordType === "safety-rule"
    ) {
      score += synonymNameHit || matchedFields.has("name") ? 7 : 2;
    } else if (rec.recordType === "overview") {
      score -= 4;
    }

    if (matchReasons.length === 0) {
      matchReasons.push(
        `Matched fields: ${Array.from(matchedFields).join(", ")}`
      );
    }

    return {
      record: rec,
      score: Math.round(score * 100) / 100,
      matchedFields: Array.from(matchedFields),
      matchReasons,
    };
  }

  /** Simple search signature kept compatible with KnowledgeDrawer and tests. */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    return this.retrieve(query, options).results;
  }

  /** Full modular retrieval pipeline returning scored results, confidence, related items, and conflicts. */
  retrieve(query: string, options: SearchOptions = {}): RetrievalOutput {
    this.ensureInit();
    const classified = classifyQuery(query);
    const primaryTokens = tokenizeQuery(query);
    const expandedTokens = expandSynonyms(primaryTokens);

    const { category, recordType, clinicId, limit = 8, language = "all" } = options;

    if (
      classified.intent === "greeting" ||
      classified.intent === "medical_diagnosis" ||
      classified.unknownClinicRequested ||
      (primaryTokens.length === 0 && expandedTokens.length === 0)
    ) {
      const missingIndicators: string[] = [];
      if (classified.intent === "medical_diagnosis") {
        missingIndicators.push(
          "Terra AI Assistant provides internal product, device, and clinic operational knowledge only and cannot diagnose medical conditions or prescribe medications."
        );
      } else if (classified.unknownClinicRequested) {
        missingIndicators.push(
          "The requested clinic name was not found among Terra Solutions' documented partner clinics (Dermadent, One Touch, Well Touch, New Age)."
        );
      }
      return {
        classified,
        primaryTokens,
        expandedTokens,
        results: [],
        confidence: "none",
        requiresClarification: false,
        clarificationCandidates: [],
        relatedRecords: [],
        conflicts: [],
        missingIndicators,
      };
    }

    let candidates = this.index;
    if (category) {
      candidates = candidates.filter((c) => c.record.category === category);
    }
    if (recordType) {
      candidates = candidates.filter((c) => c.record.recordType === recordType);
    }
    if (clinicId) {
      candidates = candidates.filter((c) => c.record.clinicIds.includes(clinicId));
    }
    if (language !== "all") {
      candidates = candidates.filter(
        (c) => c.record.language === language || c.record.language === "mixed"
      );
    }

    const scored: SearchResult[] = [];
    for (const item of candidates) {
      const res = this.scoreItem(item, primaryTokens, expandedTokens, classified);
      if (res) scored.push(res);
    }

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, limit);

    // Calibrated confidence & ambiguity detection
    let confidence: RetrievalConfidence = "none";
    let requiresClarification = false;
    let clarificationCandidates: KnowledgeRecord[] = [];
    const missingIndicators: string[] = [];

    if (topResults.length > 0 && topResults[0].score >= 4.5) {
      const top = topResults[0];
      const second = topResults[1];

      const isBroadIntent =
        classified.intent === "catalog_overview" ||
        classified.intent === "device_specs" ||
        classified.intent === "price_offer_lookup" ||
        classified.intent === "clinic_lookup" ||
        classified.intent === "comparison" ||
        classified.intent === "company_info";

      // Check if multiple distinct product entities tied closely on an underspecified query
      if (
        !isBroadIntent &&
        primaryTokens.length <= 2 &&
        second &&
        second.score >= top.score * 0.9 &&
        top.record.recordType === "product" &&
        second.record.recordType === "product" &&
        !top.matchedFields.includes("exact-name")
      ) {
        confidence = "ambiguous";
        requiresClarification = true;
        clarificationCandidates = topResults
          .filter((r) => r.score >= top.score * 0.85)
          .slice(0, 5)
          .map((r) => r.record);
      } else if (top.score >= 14) {
        confidence = "strong";
      } else {
        confidence = "partial";
      }

      if (
        classified.asksPrice &&
        !topResults.slice(0, 3).some((r) => r.record.prices.length > 0)
      ) {
        missingIndicators.push(
          "Exact pricing or promotional offers for this item are not present in the supplied Excel knowledge base."
        );
        if (confidence === "strong") confidence = "partial";
      }

      if (
        classified.asksClinic &&
        /(?:address|location|phone|hours|عنوان|رقم|مواعيد)/i.test(classified.normalized)
      ) {
        missingIndicators.push(
          "Clinic street addresses, phone numbers, and working hours are not provided in the supplied files."
        );
      }
    }

    // Related records expansion for top result
    const relatedRecords =
      topResults.length > 0 ? this.getRelated(topResults[0].record, 4) : [];

    if (topResults.length > 0) {
      topResults[0].relatedIds = relatedRecords.map((r) => r.id);
    }

    // Surface relevant conflicts
    const relevantConflicts = this.conflicts.filter((cf) =>
      topResults.some((r) =>
        r.record.conflictNotes?.some((n) => n.toLowerCase().includes(cf.topic.split(" ")[0].toLowerCase())) ||
        cf.sources.some((s) => s.sheet === r.record.source.rawSheet)
      )
    );

    return {
      classified,
      primaryTokens,
      expandedTokens,
      results: topResults,
      confidence,
      requiresClarification,
      clarificationCandidates,
      relatedRecords,
      conflicts: relevantConflicts,
      missingIndicators,
    };
  }

  /** Expand related records across clinics, safety rules, devices, and category overviews. */
  getRelated(record: KnowledgeRecord, limit = 4): KnowledgeRecord[] {
    this.ensureInit();
    const candidates: Array<{ record: KnowledgeRecord; score: number }> = [];

    for (const item of this.index) {
      const r = item.record;
      if (r.id === record.id) continue;
      let score = 0;

      // Cross-link via clinicIds
      for (const cid of record.clinicIds) {
        if (r.clinicIds.includes(cid)) score += 6;
      }

      // Cross-link treatments to pregnancy safety rule
      if (
        record.category !== "pregnancy-safety" &&
        r.category === "pregnancy-safety" &&
        r.recordType === "safety-rule"
      ) {
        const cleanRule = normalizeText(r.name.replace("Pregnancy & Lactation Safety:", ""));
        if (
          cleanRule.length >= 3 &&
          (normalizeText(record.name).includes(cleanRule) ||
            record.aliases.some((a) => cleanRule.includes(normalizeText(a))))
        ) {
          score += 9;
        }
      }

      if (r.category === record.category && r.recordType === "overview") {
        score += 4;
      } else if (r.category === record.category) {
        score += 2;
      }

      if (score > 0) {
        candidates.push({ record: r, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit).map((c) => c.record);
  }
}

export const knowledgeRetriever = new KnowledgeRetriever();
export type { QueryLanguage };
