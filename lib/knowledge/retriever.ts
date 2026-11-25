/**
 * Pre-indexed bilingual hybrid knowledge retrieval engine.
 *
 * Pipeline:
 *   Query -> QueryExpander (Normalization, Arabic Prefix/Phonetic Transliteration, Controlled Typo Recovery)
 *   -> Unsupported Compound Guard -> Candidate Scoring (BM25 IDF + Canonical Entity Hints + Field Weights)
 *   -> Multi-Entity Comparison Coverage & Broad Category Balance
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
import {
  getCanonicalDataset,
  incrementKnowledgeIndexBuildCount,
  registerKnowledgeRebuildListener,
} from "./server-store";
import { normalizeText, tokenizeQuery, type QueryLanguage } from "./normalize";
import { getTokenSynonyms, type EntityMatchHint } from "./synonyms";
import { type ClassifiedQuery } from "./intent";
import { buildExpandedQueryPlan, type ExpandedQueryPlan } from "./query-expander";
import { findControlledTypoMatch } from "./transliteration";

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
  allTokensSet: Set<string>;
  vocabWords: string[];
}

export interface RetrievalOutput {
  classified: ClassifiedQuery;
  primaryTokens: string[];
  expandedTokens: string[];
  entityHints: EntityMatchHint[];
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
  "treatments", "session", "sessions", "overview", "protocol", "injection",
  "injections", "patient", "today", "take", "severe",
  "احدث", "اصدار", "جهاز", "اجهزه", "عياده", "عيادات", "جلسه", "جلسات",
  "علاج", "علاجات", "خدمات", "خدمه", "حقن", "انواع", "نوع",
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

export class KnowledgeRetriever {
  private index: IndexedRecord[] = [];
  private recordById = new Map<string, KnowledgeRecord>();
  private termIdf = new Map<string, number>();
  private clinics: CanonicalClinic[] = [];
  private conflicts: KnowledgeConflict[] = [];
  private initialized = false;

  constructor() {
    registerKnowledgeRebuildListener(() => {
      this.initialized = false;
      this.ensureInit();
    });
  }

  private buildIndexFromRecords(
    records: KnowledgeRecord[],
    clinics: CanonicalClinic[],
    conflicts: KnowledgeConflict[]
  ): void {
    this.clinics = clinics;
    this.conflicts = conflicts;
    this.recordById.clear();
    this.termIdf.clear();

    const docFreq = new Map<string, number>();

    this.index = records.map((record) => {
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

      const vocabPool = `${nameNorm} ${aliasesNorm.join(" ")} ${tagsNorm.join(" ")}`;
      const latinWords = vocabPool.match(/[a-z]{4,}/g) || [];
      const arabicWords = vocabPool.match(/[\u0600-\u06FF]{4,}/g) || [];
      const vocabWords = Array.from(new Set([...latinWords, ...arabicWords]));

      const docTokens = new Set<string>(
        tokenizeQuery(`${record.name} ${record.aliases.join(" ")} ${record.tags.join(" ")} ${record.description}`)
      );
      for (const dt of docTokens) {
        docFreq.set(dt, (docFreq.get(dt) || 0) + 1);
      }

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
        allTokensSet: docTokens,
        vocabWords,
      };
    });

    const N = Math.max(1, this.index.length);
    for (const [term, df] of docFreq.entries()) {
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      this.termIdf.set(term, Math.min(2.6, Math.max(0.75, idf / 2 + 0.65)));
    }

    incrementKnowledgeIndexBuildCount();
    this.initialized = true;
  }

  private ensureInit(): void {
    if (this.initialized) return;
    const dataset = getCanonicalDataset();
    this.buildIndexFromRecords(dataset.records, dataset.clinics, dataset.conflicts);
  }

  /** Rebuild index in memory when dynamic sources or synonyms update. */
  rebuildIndex(customRecords?: KnowledgeRecord[]): void {
    const dataset = getCanonicalDataset();
    this.buildIndexFromRecords(
      customRecords || dataset.records,
      dataset.clinics,
      dataset.conflicts
    );
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

  /** Score a single indexed record with BM25 IDF weights, canonical entity hints, and explainable match reasons. */
  private scoreItem(
    item: IndexedRecord,
    primaryTokens: string[],
    plan: ExpandedQueryPlan,
    hintMap: Map<string, EntityMatchHint>
  ): SearchResult | null {
    let score = 0;
    const matchedFields = new Set<string>();
    const matchReasons: string[] = [];
    const matchedTokens = new Set<string>();
    const rawNorm = plan.normalizedQuery;
    const classified = plan.classified;

    // 1. Canonical Entity Resolution signal (Exact Alias / Transliteration / Phonetic Skeleton)
    const entityHint = hintMap.get(item.record.id);
    if (entityHint && entityHint.relationshipType !== "parent_category") {
      const entityBoost =
        entityHint.via === "exact_alias" || entityHint.via === "phrase"
          ? 16
          : entityHint.via === "phonetic_transliteration"
          ? 14
          : 11;
      score += entityBoost * entityHint.confidence;
      matchedFields.add(`entity-${entityHint.via}`);
      matchReasons.push(`Canonical entity match (${entityHint.matchedTerm} via ${entityHint.via})`);
    } else if (entityHint && entityHint.relationshipType === "parent_category") {
      score += 7;
      matchedFields.add("entity-category");
    }

    // 2. Exact full name or exact alias match (highest precision)
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

    // 3. Token-level BM25-weighted field matching & bilingual synonym bridge
    let matchedSpecificEntityTokens = 0;
    let synonymNameHit = Boolean(entityHint);
    const totalSpecificEntityTokens = primaryTokens.filter(
      (t) => !GENERIC_MODIFIER_TOKENS.has(t)
    ).length;

    for (const token of primaryTokens) {
      let bestDirectScore = 0;
      let directExtraHits = 0;
      let hitNameThisToken = false;
      let hitAliasThisToken = false;
      const isModifier = GENERIC_MODIFIER_TOKENS.has(token);
      const idfWeight = this.termIdf.get(token) ?? 1.0;
      const weightScale = (isModifier ? 0.25 : 1) * idfWeight;

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

      // Synonym & Arabic transliteration bridge
      let bestSynScore = 0;
      let bestSynReason = "";
      let bestSynField = "";
      if (!isModifier) {
        for (const syn of getTokenSynonyms(token)) {
          const synIdf = this.termIdf.get(syn) ?? 1.0;
          if (matchesToken(item.nameNorm, syn) || matchesToken(item.nameEnNorm, syn)) {
            const val = 11.5 * Math.min(1.4, synIdf);
            if (!hitNameThisToken && val > bestSynScore) {
              bestSynScore = val;
              bestSynField = "synonym-name";
              bestSynReason = `Synonym match ("${syn}") in title`;
            }
          } else if (item.aliasesNorm.some((a) => matchesToken(a, syn))) {
            const val = 8.5 * Math.min(1.4, synIdf);
            if (!hitAliasThisToken && val > bestSynScore) {
              bestSynScore = val;
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
      } else if (tokenScore === 0 && !isModifier) {
        const fuzzyTarget = findControlledTypoMatch(token, item.vocabWords);
        if (fuzzyTarget) {
          tokenScore += 5.0;
          matchedFields.add("fuzzy");
          matchReasons.push(`Typo recovery ("${token}" -> "${fuzzyTarget}")`);
        }
      }

      if (tokenScore > 0) {
        score += tokenScore;
        matchedTokens.add(token);
        if (!isModifier) matchedSpecificEntityTokens += 1;
      }
    }

    // 4. Broad category match when user explicitly asked for category inventory (e.g., "ايه خدمات البشرة؟")
    if (
      classified.broadCategoryHints.length > 0 &&
      classified.broadCategoryHints.includes(item.record.category) &&
      item.record.recordType !== "policy"
    ) {
      const asksDevicesBroadly = /(?:اجهزه|device|machine)/i.test(classified.normalized);
      score +=
        asksDevicesBroadly && item.record.recordType === "device"
          ? 16
          : item.record.recordType === "overview"
          ? 12
          : 9;
      matchedFields.add("broad-category");
      matchReasons.push(`Matches requested category "${item.record.category}"`);
    }

    // Reject records that matched ONLY generic modifiers, or 1 stray fuzzy hit when multiple out-of-domain terms missed
    if (
      totalSpecificEntityTokens > 0 &&
      matchedSpecificEntityTokens === 0 &&
      !synonymNameHit &&
      !matchedFields.has("exact-name") &&
      !matchedFields.has("phrase-name") &&
      !matchedFields.has("broad-category")
    ) {
      return null;
    }

    if (
      totalSpecificEntityTokens >= 3 &&
      matchedSpecificEntityTokens <= 1 &&
      !synonymNameHit &&
      !matchedFields.has("exact-name") &&
      !matchedFields.has("phrase-name") &&
      !matchedFields.has("name") &&
      !matchedFields.has("alias") &&
      !matchedFields.has("broad-category") &&
      matchedFields.has("fuzzy")
    ) {
      return null;
    }

    if (score <= 0) return null;

    // 5. Query token coverage bonus
    if (primaryTokens.length >= 2) {
      const coverage = matchedTokens.size / primaryTokens.length;
      if (coverage >= 1) {
        score += 10;
        matchReasons.push("Matches all query terms");
      } else if (coverage >= 0.5) {
        score += coverage * 6;
      }
    }

    // 6. Intent-aware relevance boosts
    const rec = item.record;
    if (classified.intent === "safety_pregnancy" && rec.category === "pregnancy-safety") {
      score += 5;
      matchReasons.push("Matches pregnancy & lactation safety intent");
      if (rec.recordType === "safety-rule") {
        const safetyStopTokens = new Set([
          "حمل",
          "حامل",
          "الحمل",
          "للحامل",
          "رضاعة",
          "الرضاعة",
          "مرضع",
          "بترضع",
          "pregnant",
          "pregnancy",
          "lactation",
          "breastfeeding",
          "safe",
          "safety",
          "allowed",
          "مسموح",
          "ممنوع",
          "امن",
          "آمن",
        ]);
        const nonSafetyTokens = primaryTokens.filter((t) => !safetyStopTokens.has(t));
        const matchesSpecificService = nonSafetyTokens.some((tok) => {
          if (
            matchesToken(item.nameNorm, tok) ||
            matchesToken(item.nameEnNorm, tok) ||
            item.aliasesNorm.some((a) => matchesToken(a, tok))
          ) {
            return true;
          }
          return getTokenSynonyms(tok).some(
            (syn) =>
              matchesToken(item.nameNorm, syn) ||
              matchesToken(item.nameEnNorm, syn) ||
              item.aliasesNorm.some((a) => matchesToken(a, syn))
          );
        });
        if (matchesSpecificService) {
          score += 14;
          matchReasons.push("Matches specific treatment pregnancy safety rule");
        }
      }
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
      rec.recordType === "service" ||
      (rec.recordType === "safety-rule" &&
        (classified.asksSafety || classified.intent === "safety_pregnancy"))
    ) {
      score += synonymNameHit || matchedFields.has("name") ? 7 : 2;
    } else if (rec.recordType === "overview") {
      score -= 2;
    }

    if (
      rec.category === "pregnancy-safety" &&
      !classified.asksSafety &&
      classified.intent !== "safety_pregnancy"
    ) {
      // Keep pregnancy/lactation restriction rows secondary unless the user asked about safety
      score -= 18;
    }

    if (matchReasons.length === 0) {
      matchReasons.push(`Matched fields: ${Array.from(matchedFields).join(", ")}`);
    }

    return {
      record: rec,
      score: Math.round(score * 100) / 100,
      matchedFields: Array.from(matchedFields),
      matchReasons,
    };
  }

  /** Score a candidate list cleanly given a query plan. */
  private scoreCandidates(
    candidates: IndexedRecord[],
    plan: ExpandedQueryPlan
  ): SearchResult[] {
    const hintMap = new Map<string, EntityMatchHint>();
    for (const h of plan.entityHints) {
      if (!hintMap.has(h.canonicalId)) {
        hintMap.set(h.canonicalId, h);
      }
    }

    const scored: SearchResult[] = [];
    for (const item of candidates) {
      const res = this.scoreItem(item, plan.primaryTokens, plan, hintMap);
      if (res) scored.push(res);
    }
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  /** Ensure comparison queries return top matches for BOTH compared options instead of omitting one. */
  private mergeComparisonEntities(
    baseResults: SearchResult[],
    candidates: IndexedRecord[],
    clauses: [string, string],
    limit: number
  ): SearchResult[] {
    const planLeft = buildExpandedQueryPlan(clauses[0]);
    const planRight = buildExpandedQueryPlan(clauses[1]);
    const leftTop = this.scoreCandidates(candidates, planLeft)[0];
    const rightTop = this.scoreCandidates(candidates, planRight)[0];

    const merged: SearchResult[] = [];
    const seen = new Set<string>();

    const pushUnique = (item?: SearchResult) => {
      if (!item || seen.has(item.record.id)) return;
      seen.add(item.record.id);
      merged.push(item);
    };

    // Promote curated comparison tables ONLY when both compared targets actually match that table
    const leftTokens = planLeft.primaryTokens.filter((t) => !GENERIC_MODIFIER_TOKENS.has(t));
    const rightTokens = planRight.primaryTokens.filter((t) => !GENERIC_MODIFIER_TOKENS.has(t));
    const matchesBothSides = (rec: KnowledgeRecord): boolean => {
      const hay = normalizeText(
        `${rec.name} ${rec.aliases.join(" ")} ${rec.tags.join(" ")} ${rec.description}`
      );
      const hitsSide = (toks: string[]) =>
        toks.some(
          (tok) =>
            matchesToken(hay, tok) ||
            getTokenSynonyms(tok).some((syn) => matchesToken(hay, syn))
        );
      return leftTokens.length > 0 && rightTokens.length > 0 && hitsSide(leftTokens) && hitsSide(rightTokens);
    };

    for (const r of baseResults) {
      if (r.record.recordType === "comparison" && matchesBothSides(r.record)) {
        pushUnique(r);
      }
    }
    pushUnique(leftTop);
    pushUnique(rightTop);
    for (const r of baseResults) {
      if (r.record.recordType !== "comparison" || matchesBothSides(r.record)) {
        pushUnique(r);
      }
      if (merged.length >= limit) break;
    }

    return merged.slice(0, limit);
  }

  /** Ensure broad multi-category inquiries (e.g. skin treatments) represent each matched department. */
  private balanceBroadCategoryResults(
    baseResults: SearchResult[],
    categories: KnowledgeCategory[],
    limit: number
  ): SearchResult[] {
    const out: SearchResult[] = [];
    const seen = new Set<string>();
    for (const cat of categories) {
      const catBest = baseResults.filter((r) => r.record.category === cat).slice(0, 2);
      for (const item of catBest) {
        if (!seen.has(item.record.id)) {
          seen.add(item.record.id);
          out.push(item);
        }
      }
    }
    for (const item of baseResults) {
      if (!seen.has(item.record.id)) {
        seen.add(item.record.id);
        out.push(item);
      }
      if (out.length >= limit) break;
    }
    return out.slice(0, limit);
  }

  /** Simple search signature kept compatible with KnowledgeDrawer and tests. */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    return this.retrieve(query, options).results;
  }

  /** Full hybrid retrieval pipeline returning scored results, confidence, related items, and conflicts. */
  retrieve(query: string, options: SearchOptions = {}): RetrievalOutput {
    this.ensureInit();
    const plan = buildExpandedQueryPlan(query);
    const { classified, primaryTokens, expandedTokens, entityHints, unsupportedCompound } = plan;

    const {
      category,
      recordType,
      clinicId,
      limit = 8,
      language = "all",
      includeInactive = false,
    } = options;

    // Early guard: unsupported compound service (e.g. "بوتوكس الشعر" must NOT return injectable Botox)
    if (unsupportedCompound) {
      const msg =
        classified.language === "ar"
          ? unsupportedCompound.reasonAr
          : unsupportedCompound.reasonEn;
      return {
        classified,
        primaryTokens,
        expandedTokens,
        entityHints: [],
        results: [],
        confidence: "none",
        requiresClarification: false,
        clarificationCandidates: [],
        relatedRecords: [],
        conflicts: [],
        missingIndicators: [msg],
      };
    }

    // Early guard: ambiguous generic query ("عايز اعرف الجلسة.")
    if (classified.isAmbiguousGeneric) {
      const starterIds = [
        "facial-hydrafacial",
        "fillers-overview",
        "botox-overview",
        "laser-hair-removal-overview",
        "skin-booster-overview",
      ];
      const candidates = starterIds
        .map((id) => this.recordById.get(id))
        .filter((r): r is KnowledgeRecord => Boolean(r));
      return {
        classified,
        primaryTokens,
        expandedTokens,
        entityHints: [],
        results: [],
        confidence: "ambiguous",
        requiresClarification: true,
        clarificationCandidates: candidates,
        relatedRecords: [],
        conflicts: [],
        missingIndicators: [],
      };
    }

    if (
      classified.intent === "greeting" ||
      classified.intent === "medical_diagnosis" ||
      classified.unknownClinicRequested ||
      (primaryTokens.length === 0 &&
        expandedTokens.length === 0 &&
        classified.broadCategoryHints.length === 0 &&
        entityHints.length === 0)
    ) {
      const missingIndicators: string[] = [];
      if (classified.intent === "medical_diagnosis") {
        missingIndicators.push(
          "Terra Solutions Assistant provides internal product, device, and clinic operational knowledge only and cannot diagnose medical conditions or prescribe medications."
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
        entityHints,
        results: [],
        confidence: "none",
        requiresClarification: false,
        clarificationCandidates: [],
        relatedRecords: [],
        conflicts: [],
        missingIndicators,
      };
    }

    let candidates = includeInactive
      ? this.index
      : this.index.filter((c) => (c.record.status ?? "active") === "active");
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

    const scored = this.scoreCandidates(candidates, plan);
    let topResults = scored.slice(0, limit);

    if (classified.asksComparison && plan.comparisonClauses && topResults.length > 0) {
      topResults = this.mergeComparisonEntities(
        scored,
        candidates,
        plan.comparisonClauses,
        limit
      );
    } else if (classified.broadCategoryHints.length > 0 && topResults.length > 0) {
      topResults = this.balanceBroadCategoryResults(
        scored,
        classified.broadCategoryHints,
        limit
      );
    }

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
        classified.intent === "company_info" ||
        classified.broadCategoryHints.length > 0;

      // Underspecified single-brand ambiguity (e.g. "Juvederm")
      if (
        !isBroadIntent &&
        primaryTokens.length <= 2 &&
        second &&
        second.score >= top.score * 0.9 &&
        top.record.recordType === "product" &&
        second.record.recordType === "product" &&
        !top.matchedFields.includes("exact-name") &&
        !top.matchedFields.includes("entity-exact_alias") &&
        !top.matchedFields.includes("entity-phonetic_transliteration")
      ) {
        confidence = "ambiguous";
        requiresClarification = true;
        clarificationCandidates = topResults
          .filter((r) => r.score >= top.score * 0.85)
          .slice(0, 5)
          .map((r) => r.record);
      } else if (top.score >= 13.5) {
        confidence = "strong";
      } else {
        confidence = "partial";
      }

      if (
        classified.asksPrice &&
        !topResults.slice(0, 3).some((r) => r.record.prices.length > 0)
      ) {
        missingIndicators.push(
          "السعر مش موجود في البيانات المتاحة حاليًا، محتاجين نراجعه مع المسؤول. / Exact pricing or promotional offers for this item are not present in the supplied Excel knowledge base."
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

    const relatedRecords =
      topResults.length > 0 ? this.getRelated(topResults[0].record, 4) : [];

    if (topResults.length > 0) {
      topResults[0].relatedIds = relatedRecords.map((r) => r.id);
    }

    const relevantConflicts = this.conflicts.filter((cf) =>
      topResults.some((r) =>
        r.record.conflictNotes?.some((n) =>
          n.toLowerCase().includes(cf.topic.split(" ")[0].toLowerCase())
        ) || cf.sources.some((s) => s.sheet === r.record.source.rawSheet)
      )
    );

    return {
      classified,
      primaryTokens,
      expandedTokens,
      entityHints,
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

      for (const cid of record.clinicIds) {
        if (r.clinicIds.includes(cid)) score += 6;
      }

      if (
        record.category !== "pregnancy-safety" &&
        r.category === "pregnancy-safety" &&
        r.recordType === "safety-rule"
      ) {
        const cleanRule = normalizeText(
          r.name.replace("Pregnancy & Lactation Safety:", "")
        );
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
