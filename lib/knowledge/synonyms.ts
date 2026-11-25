/**
 * Knowledge-aware bilingual synonym, Arabic phonetic transliteration, typo bridge,
 * and unsupported-compound guard index loaded once from `knowledge/synonyms/arabic-english-synonyms.json`.
 */

import rawSynonymDict from "@/knowledge/synonyms/arabic-english-synonyms.json";
import { normalizeText, stripArabicPrefix } from "./normalize";
import { arabicPhoneticSkeleton, findControlledTypoMatch } from "./transliteration";

export type SynonymRelationType =
  | "exact_synonym"
  | "transliteration"
  | "common_typo"
  | "related_service"
  | "parent_category";

export interface CanonicalSynonymEntry {
  canonicalId: string;
  canonicalName: string;
  relationshipType: SynonymRelationType;
  aliases: string[];
  commonQuestions: string[];
  relatedConcepts: string[];
  confidence: number;
}

export interface UnsupportedCompoundGuard {
  id: string;
  patterns: string[];
  reasonAr: string;
  reasonEn: string;
}

interface RawSynonymFile {
  version: number;
  language: string;
  entries: CanonicalSynonymEntry[];
  unsupportedCompoundGuards?: UnsupportedCompoundGuard[];
}

export interface EntityMatchHint {
  canonicalId: string;
  canonicalName: string;
  matchedTerm: string;
  via: "exact_alias" | "phonetic_transliteration" | "controlled_typo" | "phrase";
  relationshipType: SynonymRelationType;
  confidence: number;
}

/** Curated bidirectional token bridges merged cleanly with canonical synonym entries. */
export const SYNONYM_MAP: Record<string, string[]> = {
  // Facial & skin care
  facial: ["فيشيال", "فيشال", "فيشيول", "فيشيل", "فيشل", "فشيال", "تنظيف بشرة", "hydrafacial", "dermapen", "peeling", "factor five"],
  فيشيال: ["facial", "hydrafacial", "تنظيف بشرة", "فيشال"],
  فيشال: ["facial", "hydrafacial", "فيشيال"],
  فيشيل: ["facial", "hydrafacial", "فيشيال"],
  فيشل: ["facial", "hydrafacial", "فيشيال"],
  فيشيول: ["facial", "hydrafacial", "فيشيال"],
  فشيال: ["facial", "hydrafacial", "فيشيال"],
  facail: ["facial", "فيشيال", "فيشال"],
  faciel: ["facial", "فيشيال", "فيشال"],
  faical: ["facial", "فيشيال", "فيشال"],
  hydra: ["hydrafacial", "هايدرافيشال", "هايدرا فيشال"],
  hydrafacial: ["facial", "فيشيال", "فيشال", "هايدرافيشال", "هايدرا فيشال", "هيدرافيشال"],
  هايدرافيشال: ["hydrafacial", "facial"],
  هيدرافيشال: ["hydrafacial", "facial"],
  dermapen: ["ديرمابن", "ديرمابين", "microneedling"],
  ديرمابن: ["dermapen", "microneedling"],
  ديرمابين: ["dermapen", "microneedling"],
  peeling: ["تقشير", "peels", "tca"],
  تقشير: ["peeling", "tca"],

  // Fillers & brands
  filler: ["فيلر", "فلر", "فيلار", "dermal filler"],
  fillers: ["فيلر", "فلر", "فيلار", "filler"],
  filer: ["filler", "فيلر", "فلر"],
  fillar: ["filler", "فيلر", "فلر"],
  filers: ["filler", "fillers", "فيلر"],
  juviderm: ["juvederm", "جوفيديرم"],
  جوفيديرم: ["juvederm"],
  جوفدرم: ["juvederm"],
  teoxane: ["teosyal", "تيوسيال"],
  تيوسيال: ["teosyal"],
  radiese: ["radiesse", "رادياس", "راديس"],
  رادياس: ["radiesse", "calcium filler"],
  راديس: ["radiesse", "رادياس"],
  فيلر: ["filler", "فلر"],
  فلر: ["filler", "فيلر"],
  فيلار: ["filler", "فيلر"],

  // Botox & brands
  botox: ["بوتوكس", "بوتكس", "بوتاكس"],
  botoks: ["botox", "بوتوكس", "بوتكس"],
  botx: ["botox", "بوتوكس", "بوتكس"],
  بوتوكس: ["botox", "بوتكس"],
  بوتكس: ["botox", "بوتوكس"],
  بوتاكس: ["botox", "بوتوكس"],
  ديسبورت: ["dysport"],
  دسبورت: ["dysport"],
  نابوتا: ["nabota"],
  زيومين: ["xeomin"],

  // Threads
  thread: ["خيوط", "threads", "pdo", "aptos", "rainbow"],
  threads: ["خيوط", "thread", "pdo", "aptos", "rainbow"],
  threds: ["threads", "خيوط", "aptos", "pdo"],
  خيوط: ["threads", "pdo", "aptos", "rainbow"],
  ابتوس: ["aptos"],

  // Laser hair removal
  laser: ["ليزر", "لازر", "لاسير", "candela", "cynosure", "deka", "quanta"],
  lazer: ["laser", "ليزر"],
  removel: ["removal", "ازاله"],
  removal: ["ازاله", "إزالة"],
  كانديلا: ["candela", "gentlemax"],
  كنديلا: ["candela", "gentlemax"],
  سايناشور: ["cynosure"],
  ساينوشور: ["cynosure"],
  ليزر: ["laser"],
  لازر: ["laser", "ليزر"],
  لاسير: ["laser", "ليزر"],

  // Hair & face treatments
  hair: ["شعر", "الشعر", "cyj", "prp"],
  شعر: ["hair", "prp", "cyj"],
  بلازما: ["prp", "platelet"],
  بلازمه: ["prp", "بلازما"],
  prp: ["بلازما"],
  ميزوثيرابي: ["mesotherapy"],
  ميزو: ["mesotherapy", "ميزوثيرابي"],
  mesotherapy: ["ميزوثيرابي"],
  stem: ["خلايا جذعية", "stem cells"],
  جذعيه: ["stem cells", "الخلايا الجذعية"],
  face: ["وجه", "الوجه", "بشرة", "بشره"],
  skin: ["بشرة", "بشره", "جلد"],
  بشره: ["skin", "face", "facial"],
  وجه: ["face", "facial"],

  // Skin boosters & collagen stimulators
  booster: ["نضارة", "نضاره", "سكين بوستر", "سكن بوستر", "skin booster", "profhilo", "jalupro", "exofecta"],
  boosters: ["نضارة", "نضاره", "سكين بوستر", "skin booster", "profhilo", "jalupro"],
  بوستر: ["skin booster", "نضاره", "profhilo", "jalupro", "exofecta"],
  بوسترز: ["skin booster", "نضاره"],
  بروفايلو: ["profhilo"],
  بروفيلو: ["profhilo"],
  جالوبرو: ["jalupro"],
  اكزوفكتا: ["exofecta"],
  اكسوفكتا: ["exofecta"],
  اكزوسوم: ["exofecta", "exosomes"],
  سكلبترا: ["sculptra"],
  سكالبترا: ["sculptra"],
  sculptera: ["sculptra"],
  نضاره: ["skin booster", "exofecta", "profhilo", "نضارة"],
  collagen: ["كولاجين"],
  كولاجين: ["collagen"],

  // Tattoo & microblading
  tattoo: ["تاتو", "تاتوه", "وشم", "q-switch", "microblading"],
  tatoo: ["tattoo", "تاتو"],
  تاتو: ["tattoo", "microblading"],
  تاتوه: ["tattoo", "تاتو"],
  وشم: ["tattoo", "تاتو"],
  microblading: ["مايكروبليدينغ", "مايكروبليدنج", "ميكروبليدنج", "ديرمادنت", "dermadent"],
  مايكروبليدينغ: ["microblading", "dermadent"],
  مايكروبليدنج: ["microblading", "dermadent"],
  ميكروبليدنج: ["microblading", "dermadent"],

  // Pregnancy & lactation
  pregnancy: ["حمل", "الحمل", "حامل", "pregnant", "lactation"],
  pregnant: ["حمل", "الحمل", "حامل", "pregnancy"],
  lactation: ["رضاعة", "الرضاعة", "مرضع", "بترضع", "breastfeeding"],
  breastfeeding: ["رضاعة", "الرضاعة", "مرضع", "بترضع", "lactation"],
  safe: ["مسموح", "امن", "آمن"],
  حمل: ["pregnancy", "pregnant"],
  حامل: ["pregnancy", "pregnant"],
  رضاعه: ["lactation", "breastfeeding"],
  بترضع: ["lactation", "breastfeeding", "رضاعة"],
  مرضع: ["lactation", "breastfeeding", "رضاعة"],

  // Slimming & body contouring
  slimming: ["تنحيف", "تخسيس", "نحت", "بادي كونتورنج", "بودي كونتورينج", "دهون", "wegovy", "lipolysis", "z-lipo", "hifu", "endolift", "roblex", "venus"],
  contouring: ["body contouring", "roblex", "venus legacy", "hifu", "deka slimming", "تنحيف", "نحت"],
  كونتورنج: ["body contouring", "slimming", "نحت"],
  كونتورينج: ["body contouring", "slimming", "نحت"],
  نحت: ["body contouring", "slimming", "endolift", "roblex"],
  تنحيف: ["slimming", "wegovy", "lipolysis", "z-lipo"],
  تخسيس: ["slimming", "wegovy", "lipolysis"],
  دهون: ["slimming", "lipolysis", "z-lipo", "cool shaping"],
  وزن: ["wegovy", "slimming"],
  weight: ["wegovy", "slimming"],
  هيفو: ["hifu"],
  هايفو: ["hifu"],
  اندولفت: ["endolift"],
  اندوليفت: ["endolift"],
  ويجوفي: ["wegovy"],
  ويجوفى: ["wegovy"],
  فيفاشي: ["vivace"],
  فيفاتشي: ["vivace"],

  // Dental
  dental: ["اسنان", "أسنان", "veneer", "night guard", "snap-on"],
  teeth: ["اسنان", "أسنان", "dental", "veneer"],
  veneer: ["فينير", "فينيير", "فينيرز", "veneers", "e-max"],
  veneers: ["فينير", "فينيير", "فينيرز", "veneer", "e-max"],
  braces: ["تقويم", "orthodontics"],
  orthodontics: ["تقويم"],
  implants: ["زراعة", "implant"],
  اسنان: ["dental", "teeth", "veneer"],
  فينير: ["veneer", "veneers"],
  فينيير: ["veneer", "veneers"],
  فينيرز: ["veneer", "veneers"],
  تقويم: ["orthodontics", "braces", "dental"],
  زراعه: ["implants", "dental"],

  // Clinics & devices
  clinic: ["عيادة", "عيادات", "فرع"],
  clinics: ["عيادة", "عيادات", "فروع"],
  عياده: ["clinic", "clinics"],
  عيادات: ["clinics", "clinic"],
  فرع: ["clinic", "clinics"],
  فروع: ["clinic", "clinics"],
  dermaden: ["dermadent", "demadent", "ديرمادنت"],
  demadent: ["dermadent", "ديرمادنت"],
  ديرمادنت: ["dermadent", "demadent"],
  ديمادنت: ["dermadent", "demadent"],
  welltouch: ["well touch"],
  onetouch: ["one touch"],
  device: ["جهاز", "اجهزة", "أجهزة", "machine"],
  devices: ["جهاز", "اجهزة", "أجهزة", "machines"],
  جهاز: ["device", "machine"],
  اجهزه: ["devices", "machines"],
};

const parsedFile = rawSynonymDict as RawSynonymFile;

export function getCanonicalSynonymEntries(): readonly CanonicalSynonymEntry[] {
  return parsedFile.entries || [];
}

export function getUnsupportedCompoundGuards(): readonly UnsupportedCompoundGuard[] {
  return parsedFile.unsupportedCompoundGuards || [];
}

interface CompiledSynonymIndex {
  aliasToEntries: Map<string, CanonicalSynonymEntry[]>;
  skeletonToAliases: Map<string, Array<{ normAlias: string; entry: CanonicalSynonymEntry }>>;
  singleWordVocabulary: string[];
  tokenSynonymExtras: Map<string, Set<string>>;
}

let cachedCompiled: CompiledSynonymIndex | null = null;

function getCompiledIndex(): CompiledSynonymIndex {
  if (cachedCompiled) return cachedCompiled;

  const aliasToEntries = new Map<string, CanonicalSynonymEntry[]>();
  const skeletonToAliases = new Map<
    string,
    Array<{ normAlias: string; entry: CanonicalSynonymEntry }>
  >();
  const vocabSet = new Set<string>(Object.keys(SYNONYM_MAP));
  const tokenSynonymExtras = new Map<string, Set<string>>();

  const addExtra = (a: string, b: string) => {
    if (!a || !b || a === b) return;
    if (!tokenSynonymExtras.has(a)) tokenSynonymExtras.set(a, new Set());
    tokenSynonymExtras.get(a)!.add(b);
  };

  for (const entry of getCanonicalSynonymEntries()) {
    const cleanAliases = entry.aliases.map((a) => normalizeText(a)).filter(Boolean);
    const singleTokens = new Set<string>();
    const phraseAliases = new Set<string>();

    for (const a of cleanAliases) {
      const stripped = stripArabicPrefix(a);
      if (!aliasToEntries.has(a)) aliasToEntries.set(a, []);
      aliasToEntries.get(a)!.push(entry);

      if (stripped !== a) {
        if (!aliasToEntries.has(stripped)) aliasToEntries.set(stripped, []);
        aliasToEntries.get(stripped)!.push(entry);
      }

      if (!a.includes(" ")) {
        vocabSet.add(a);
        singleTokens.add(a);
        if (stripped !== a) {
          vocabSet.add(stripped);
          singleTokens.add(stripped);
        }

        if (/^[\u0600-\u06FF]+$/.test(stripped) && stripped.length >= 4) {
          const sk = arabicPhoneticSkeleton(stripped);
          if (sk.length >= 3) {
            if (!skeletonToAliases.has(sk)) skeletonToAliases.set(sk, []);
            skeletonToAliases.get(sk)!.push({ normAlias: stripped, entry });
          }
        }
      } else {
        phraseAliases.add(a);
      }
    }

    // Bridge exact single tokens & core English terms inside the same canonical entry
    const bridgePool = new Set<string>([...singleTokens]);
    for (const phrase of phraseAliases) {
      if (phrase.split(" ").length <= 3) bridgePool.add(phrase);
    }

    if (entry.relationshipType !== "parent_category") {
      for (const t of singleTokens) {
        for (const target of bridgePool) {
          addExtra(t, target);
        }
      }
    }
  }

  cachedCompiled = {
    aliasToEntries,
    skeletonToAliases,
    singleWordVocabulary: Array.from(vocabSet),
    tokenSynonymExtras,
  };
  return cachedCompiled;
}

/** Match unsupported compound procedures (e.g., "بوتوكس الشعر" must not map to injectable Botox). */
export function matchUnsupportedCompound(rawOrNormalizedQuery: string): UnsupportedCompoundGuard | null {
  const normQuery = normalizeText(rawOrNormalizedQuery);
  for (const guard of getUnsupportedCompoundGuards()) {
    for (const pat of guard.patterns) {
      const normPat = normalizeText(pat);
      if (normPat && normQuery.includes(normPat)) {
        return guard;
      }
    }
  }
  return null;
}

/** Resolve tokens & phrases against verified canonical synonym entries, Arabic phonetic skeletons, and typos. */
export function resolveCanonicalEntities(
  tokens: string[],
  normalizedQuery: string
): EntityMatchHint[] {
  const { aliasToEntries, skeletonToAliases, singleWordVocabulary } = getCompiledIndex();
  const hints: EntityMatchHint[] = [];
  const seen = new Set<string>();

  const pushHint = (entry: CanonicalSynonymEntry, matchedTerm: string, via: EntityMatchHint["via"]) => {
    const key = `${entry.canonicalId}::${via}`;
    if (seen.has(key)) return;
    seen.add(key);
    hints.push({
      canonicalId: entry.canonicalId,
      canonicalName: entry.canonicalName,
      matchedTerm,
      via,
      relationshipType: entry.relationshipType,
      confidence: via === "exact_alias" || via === "phrase" ? entry.confidence : entry.confidence * 0.9,
    });
  };

  // 1. Multi-word phrase aliases present in normalized query (highest precision, e.g. "body contouring", "skin booster")
  for (const [alias, entries] of aliasToEntries.entries()) {
    if (!alias.includes(" ")) continue;
    if (normalizedQuery.includes(alias)) {
      for (const e of entries) {
        pushHint(e, alias, "phrase");
      }
    }
  }

  // 2. Token-level exact aliases, Arabic phonetic skeleton bridges, and controlled typos
  for (const token of tokens) {
    const exactEntries = aliasToEntries.get(token);
    if (exactEntries && exactEntries.length > 0) {
      for (const e of exactEntries) {
        pushHint(e, token, "exact_alias");
      }
      continue;
    }

    // Phonetic Arabic transliteration match (e.g., فشيل -> فيشيال -> facial-hydrafacial)
    if (/^[\u0600-\u06FF]+$/.test(token) && token.length >= 4) {
      const sk = arabicPhoneticSkeleton(token);
      const skMatches = sk.length >= 3 ? skeletonToAliases.get(sk) : undefined;
      if (skMatches && skMatches.length > 0) {
        for (const m of skMatches) {
          pushHint(m.entry, m.normAlias, "phonetic_transliteration");
        }
        continue;
      }
    }

    // Controlled typo fallback against verified dictionary single words
    const typoTarget = findControlledTypoMatch(token, singleWordVocabulary);
    if (typoTarget) {
      const targetEntries = aliasToEntries.get(typoTarget);
      if (targetEntries && targetEntries.length > 0) {
        for (const e of targetEntries) {
          pushHint(e, typoTarget, "controlled_typo");
        }
      }
    }
  }

  return hints;
}

/** Return normalized synonyms/transliterations for a single normalized token cleanly without exploding broad categories. */
export function getTokenSynonyms(token: string): string[] {
  const normTok = stripArabicPrefix(normalizeText(token));
  const { skeletonToAliases, singleWordVocabulary, tokenSynonymExtras } = getCompiledIndex();
  const out = new Set<string>();

  const appendList = (list?: Iterable<string>) => {
    if (!list) return;
    for (const s of list) {
      const norm = normalizeText(s);
      if (norm && norm !== normTok) {
        out.add(norm);
      }
    }
  };

  appendList(SYNONYM_MAP[normTok]);
  appendList(SYNONYM_MAP[token]);
  appendList(tokenSynonymExtras.get(normTok));

  // If no direct map entry hit, bridge novel Arabic transliterations or controlled typos cleanly
  if (out.size === 0) {
    if (/^[\u0600-\u06FF]+$/.test(normTok) && normTok.length >= 4) {
      const sk = arabicPhoneticSkeleton(normTok);
      const skHits = sk.length >= 3 ? skeletonToAliases.get(sk) : undefined;
      if (skHits) {
        for (const h of skHits) {
          out.add(h.normAlias);
          appendList(SYNONYM_MAP[h.normAlias]);
          appendList(tokenSynonymExtras.get(h.normAlias));
        }
      }
    }
    if (out.size === 0) {
      const typoTarget = findControlledTypoMatch(normTok, singleWordVocabulary);
      if (typoTarget && typoTarget !== normTok) {
        out.add(typoTarget);
        appendList(SYNONYM_MAP[typoTarget]);
        appendList(tokenSynonymExtras.get(typoTarget));
      }
    }
  }

  return Array.from(out);
}

/** Expand query tokens with normalized bilingual synonyms & transliterations. */
export function expandSynonyms(tokens: string[]): string[] {
  const expanded = new Set<string>();
  for (const token of tokens) {
    for (const norm of getTokenSynonyms(token)) {
      if (!tokens.includes(norm)) {
        expanded.add(norm);
      }
    }
  }
  return Array.from(expanded);
}
