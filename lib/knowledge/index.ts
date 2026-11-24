/**
 * Knowledge search engine.
 * Provides keyword-based search with scoring, bilingual synonym expansion,
 * typo tolerance, and category filtering.
 *
 * Architecture note: This is a lightweight local search implementation.
 * The KnowledgeEngine interface is designed so a more advanced
 * semantic search or RAG implementation can replace it later.
 */

import type {
  KnowledgeRecord,
  KnowledgeCategory,
  SearchResult,
  SearchOptions,
  KnowledgeCategoryInfo,
} from "@/types/knowledge";
import { parseKnowledgeData } from "./parser";
import { CATEGORIES } from "./categories";
import rawKnowledgeData from "@/public/data/knowledge.json";

/** Bilingual synonyms & common call-center typo expansions. */
const SYNONYM_MAP: Record<string, string[]> = {
  // English -> Arabic / variants
  filler: ["فيلر", "فلر", "dermal", "juvederm", "teosyal", "radiesse"],
  fillers: ["فيلر", "فلر", "filler"],
  filer: ["filler", "فيلر", "فلر"],
  juviderm: ["juvederm"],
  botox: ["بوتوكس", "بوتكس", "dysport", "nabota", "xeomin"],
  botoks: ["botox", "بوتوكس", "بوتكس"],
  thread: ["خيوط", "threads", "pdo", "aptos"],
  threads: ["خيوط", "thread", "pdo", "aptos"],
  laser: ["ليزر", "candela", "cynosure", "deka", "quanta"],
  lazer: ["laser", "ليزر"],
  removel: ["removal", "ازاله"],
  removal: ["ازاله", "إزالة"],
  hair: ["شعر", "الشعر", "cyj", "prp"],
  face: ["وجه", "الوجه", "بشرة", "بشره"],
  skin: ["بشرة", "بشره", "جلد"],
  booster: ["نضارة", "skin booster", "profhilo", "jalupro", "exofecta"],
  boosters: ["نضارة", "skin booster", "profhilo", "jalupro"],
  facial: ["فيشال", "hydrafacial", "dermapen", "peeling"],
  "hydra": ["hydrafacial", "هايدرافيشال", "هايدرا فيشال"],
  hydrafacial: ["فيشال", "هايدرافيشال", "هايدرا فيشال"],
  dermapen: ["ديرمابن", "microneedling"],
  peeling: ["تقشير", "peels"],
  tattoo: ["تاتو", "وشم", "q-switch", "microblading"],
  tatoo: ["tattoo", "تاتو"],
  microblading: ["مايكروبليدينغ", "ديرمادنت"],
  pregnancy: ["حمل", "الحمل", "حامل", "pregnant", "lactation"],
  pregnant: ["حمل", "الحمل", "حامل", "pregnancy"],
  lactation: ["رضاعة", "الرضاعة", "مرضع", "breastfeeding"],
  breastfeeding: ["رضاعة", "الرضاعة", "مرضع", "lactation"],
  safe: ["مسموح", "امن", "آمن"],
  slimming: ["تنحيف", "دهون", "wegovy", "lipolysis", "z-lipo", "hifu", "endolift"],
  weight: ["وزن", "wegovy", "تنحيف"],
  device: ["جهاز", "اجهزة", "أجهزة", "machine"],
  devices: ["جهاز", "اجهزة", "أجهزة", "machines", "candela", "vivace", "hifu", "deka"],
  specifications: ["مواصفات", "نظام", "مميزات", "تقنية", "استخدام", "device"],
  specs: ["مواصفات", "نظام", "مميزات", "device"],
  dental: ["اسنان", "أسنان", "veneer", "night guard", "snap-on"],
  teeth: ["اسنان", "أسنان", "dental", "veneer"],
  veneer: ["فينير", "فينيير", "veneers", "smile"],
  veneers: ["فينير", "فينيير", "veneer"],
  clinic: ["عيادة", "عيادات", "well touch", "new age", "demadent", "one touch"],
  clinics: ["عيادة", "عيادات", "well touch", "new age", "demadent", "one touch"],
  dermaden: ["demadent", "ديرمادنت"],
  dermadent: ["demadent", "ديرمادنت"],
  price: ["سعر", "اسعار", "أسعار", "aed"],
  prices: ["سعر", "اسعار", "أسعار", "aed"],
  offer: ["عرض", "عروض", "package", "prices"],
  offers: ["عروض", "عرض", "package", "prices"],
  package: ["باقة", "عروض", "prices"],
  collagen: ["كولاجين", "sculptra", "radiesse", "olidia"],
  // Arabic -> English / variants
  فيلر: ["filler", "فلر"],
  فلر: ["filler", "فيلر"],
  بوتوكس: ["botox", "بوتكس"],
  بوتكس: ["botox", "بوتوكس"],
  ليزر: ["laser"],
  خيوط: ["threads", "pdo", "aptos"],
  شعر: ["hair", "prp", "cyj"],
  نضاره: ["booster", "exofecta", "profhilo", "نضارة"],
  فيشال: ["facial", "hydrafacial"],
  ديرمابن: ["dermapen", "microneedling"],
  تقشير: ["peeling", "peels"],
  تاتو: ["tattoo", "microblading"],
  حمل: ["pregnancy", "pregnant"],
  حامل: ["pregnancy", "pregnant"],
  رضاعه: ["lactation", "breastfeeding"],
  تنحيف: ["slimming", "wegovy", "lipolysis", "z-lipo"],
  اسنان: ["dental", "teeth", "veneer"],
  فينير: ["veneer", "veneers"],
  فينيير: ["veneer", "veneers"],
  عياده: ["clinic", "well touch", "new age", "demadent", "one touch"],
  عيادات: ["clinics", "well touch", "new age", "demadent", "one touch"],
  جهاز: ["device", "machine"],
  اجهزه: ["devices", "machines"],
  سعر: ["price", "aed"],
  اسعار: ["prices", "aed"],
};

/** Common stop words ignored during token scoring. */
const STOP_WORDS = new Set([
  "is", "of", "to", "in", "on", "at", "by", "or", "an", "as", "we", "do",
  "my", "me", "it", "be", "no", "so", "up", "if", "am", "he", "us", "was",
  "has", "had", "did", "not", "but", "all", "any", "one", "get", "got",
  "the", "and", "for", "with", "that", "this", "what", "are", "how",
  "can", "you", "tell", "about", "show", "give", "find", "does", "have",
  "from", "into", "their", "there", "which", "when", "where", "who", "our",
  "will", "would", "could", "should", "currently", "available", "information",
  "customer", "asking", "compare", "between", "two", "these", "she", "they",
  "price", "prices", "pricing", "cost", "offer", "offers", "package", "packages",
  "specifications", "specs", "service", "services", "product", "products",
  "في", "من", "على", "عن", "إلى", "الى", "ما", "هي", "هو", "هل", "هم",
  "مع", "أو", "او", "التي", "الذي", "هذا", "هذه", "كيف", "ماذا", "كم",
  "ان", "أن", "إن", "لا", "لم", "لن", "قد", "كل", "فقط",
  "سعر", "اسعار", "عرض", "عروض", "مواصفات",
]);

const SHORT_DOMAIN_ACRONYMS = new Set(["ha", "rf", "uv", "2d", "3d", "6d", "7d"]);

/** Remove Arabic diacritics and normalize letter variants for search. */
export function normalizeText(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase();
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Check whether a token matches text cleanly (word-boundary for short Latin tokens). */
function matchesToken(text: string, token: string): boolean {
  if (/^[a-z0-9+-]+$/.test(token) && token.length <= 4) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(token);
}

/** Tokenize a string for search, stripping stop words and expanding synonyms. */
function tokenize(text: string): { primary: string[]; expanded: string[] } {
  const rawTokens = normalizeText(text)
    .replace(/[^\p{L}\p{N}+\s-]/gu, " ")
    .split(/\s+/)
    .filter((t) => {
      if (STOP_WORDS.has(t)) return false;
      if (/^[a-z0-9+-]+$/.test(t)) {
        return t.length >= 3 || SHORT_DOMAIN_ACRONYMS.has(t);
      }
      return t.length >= 2;
    });

  const primary = Array.from(new Set(rawTokens));
  const expandedSet = new Set<string>();

  for (const token of primary) {
    const syns = SYNONYM_MAP[token];
    if (syns) {
      for (const s of syns) {
        expandedSet.add(normalizeText(s));
      }
    }
  }

  return { primary, expanded: Array.from(expandedSet) };
}

/** Simple edit-distance check (<= 1 edit) for fuzzy matching English terms. */
function isFuzzyMatch(token: string, targetText: string): boolean {
  if (token.length < 5 || !/^[a-z]+$/.test(token)) return false;
  const words = targetText.match(/[a-z]{4,}/g) || [];
  for (const w of words) {
    if (Math.abs(w.length - token.length) > 1) continue;
    let diffs = 0;
    const minLen = Math.min(w.length, token.length);
    for (let i = 0; i < minLen; i++) {
      if (w[i] !== token[i]) diffs++;
      if (diffs > 1) break;
    }
    if (diffs + Math.abs(w.length - token.length) <= 1) return true;
  }
  return false;
}

/** Score a record against primary and synonym tokens. */
function scoreRecord(
  record: KnowledgeRecord,
  primaryTokens: string[],
  expandedTokens: string[],
  queryRaw: string
): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  const rawLower = normalizeText(queryRaw.trim());

  const titleNorm = normalizeText(record.title);
  const titleEnNorm = record.titleEn ? normalizeText(record.titleEn) : "";
  const contentNorm = normalizeText(record.content);
  const tagsNorm = record.tags.map((t) => normalizeText(t));

  // Direct phrase match on title
  if (rawLower.length >= 3 && (titleNorm.includes(rawLower) || titleEnNorm.includes(rawLower))) {
    score += 20;
    matchedFields.push("title");
  }

  // Primary token scoring
  for (const token of primaryTokens) {
    if (matchesToken(titleNorm, token) || matchesToken(titleEnNorm, token)) {
      score += 8;
      if (!matchedFields.includes("title")) matchedFields.push("title");
    }

    if (tagsNorm.some((t) => t === token || matchesToken(t, token))) {
      score += 5;
      if (!matchedFields.includes("tags")) matchedFields.push("tags");
    }

    const catInfo = CATEGORIES[record.category];
    if (catInfo) {
      const catNames = normalizeText(`${catInfo.nameAr} ${catInfo.nameEn} ${catInfo.description}`);
      if (matchesToken(catNames, token)) {
        score += 3;
        if (!matchedFields.includes("category")) matchedFields.push("category");
      }
    }

    if (matchesToken(contentNorm, token)) {
      score += 4;
      if (!matchedFields.includes("content")) matchedFields.push("content");
    } else if (isFuzzyMatch(token, `${titleNorm} ${contentNorm}`)) {
      score += 2.5;
      if (!matchedFields.includes("fuzzy")) matchedFields.push("fuzzy");
    }
  }

  // Expanded bilingual synonym scoring (lower weight so direct matches win)
  for (const syn of expandedTokens) {
    if (matchesToken(titleNorm, syn) || matchesToken(titleEnNorm, syn)) {
      score += 4;
      if (!matchedFields.includes("title")) matchedFields.push("title");
    } else if (tagsNorm.some((t) => matchesToken(t, syn))) {
      score += 2.5;
      if (!matchedFields.includes("tags")) matchedFields.push("tags");
    } else if (matchesToken(contentNorm, syn)) {
      score += 2;
      if (!matchedFields.includes("content")) matchedFields.push("content");
    }
  }

  return { score, matchedFields };
}

export class KnowledgeEngine {
  private records: KnowledgeRecord[] = [];
  private initialized = false;

  /** Initialize the engine with raw Excel-JSON data. */
  init(rawData: Record<string, string[][]>): void {
    this.records = parseKnowledgeData(rawData);
    this.initialized = true;
  }

  /** Ensure default dataset is loaded. */
  private ensureInitialized(): void {
    if (!this.initialized) {
      this.init(rawKnowledgeData as unknown as Record<string, string[][]>);
    }
  }

  /** Check if the engine has been initialized with data. */
  isReady(): boolean {
    this.ensureInitialized();
    return this.initialized && this.records.length > 0;
  }

  /** Get all parsed knowledge records. */
  getAllRecords(): KnowledgeRecord[] {
    this.ensureInitialized();
    return this.records;
  }

  /** Get the total number of knowledge records. */
  getRecordCount(): number {
    this.ensureInitialized();
    return this.records.length;
  }

  /** Search the knowledge base. */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    this.ensureInitialized();
    if (!query.trim()) return [];

    const { category, limit = 10, language = "all" } = options;
    const { primary, expanded } = tokenize(query);
    if (primary.length === 0 && expanded.length === 0) return [];

    let candidates = this.records;

    if (category) {
      candidates = candidates.filter((r) => r.category === category);
    }

    if (language !== "all") {
      candidates = candidates.filter(
        (r) => r.language === language || r.language === "mixed"
      );
    }

    const results: SearchResult[] = [];
    for (const record of candidates) {
      const { score, matchedFields } = scoreRecord(record, primary, expanded, query);
      if (score > 0) {
        results.push({ record, score, matchedFields });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /** Get a record by ID. */
  getById(id: string): KnowledgeRecord | undefined {
    this.ensureInitialized();
    return this.records.find((r) => r.id === id);
  }

  /** Get all records in a category. */
  getByCategory(category: KnowledgeCategory): KnowledgeRecord[] {
    this.ensureInitialized();
    return this.records.filter((r) => r.category === category);
  }

  /** Get related records (same category or matching tags). */
  getRelated(record: KnowledgeRecord, limit = 5): KnowledgeRecord[] {
    this.ensureInitialized();
    return this.records
      .filter((r) => r.id !== record.id)
      .map((r) => {
        let score = 0;
        if (r.category === record.category) score += 3;
        if (r.subcategory && r.subcategory === record.subcategory) score += 5;
        for (const tag of record.tags) {
          if (r.tags.includes(tag)) score += 2;
        }
        return { record: r, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.record);
  }

  /** Get all categories with record counts. */
  getCategoriesWithCounts(): KnowledgeCategoryInfo[] {
    this.ensureInitialized();
    const counts: Record<string, number> = {};
    for (const r of this.records) {
      counts[r.category] = (counts[r.category] || 0) + 1;
    }
    return Object.entries(CATEGORIES).map(([id, info]) => ({
      ...info,
      recordCount: counts[id] || 0,
    }));
  }
}

/** Singleton engine instance — auto-initializes from public/data/knowledge.json. */
export const knowledgeEngine = new KnowledgeEngine();
