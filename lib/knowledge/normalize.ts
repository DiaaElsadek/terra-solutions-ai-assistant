/**
 * Query and text normalization utilities supporting English, Modern Standard Arabic,
 * Egyptian colloquial Arabic, Arabic transliterations, and bilingual mixed queries.
 */

export type QueryLanguage = "ar" | "en" | "mixed";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Arabic-Indic digits (٠-٩) to ASCII digits (0-9). */
export function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

/**
 * Normalize Arabic and Latin text consistently while preserving word identity.
 * - Converts Arabic-Indic digits
 * - Strips diacritics (tashkeel) and tatweel
 * - Normalizes Alef variants (أ/إ/آ/ٱ -> ا), Teh Marbuta (ة -> ه), Alef Maksura (ى -> ي)
 * - Collapses expressive character elongation (>= 3 repeated letters, e.g. فييييشيال -> فيشيال)
 */
export function normalizeText(text: string): string {
  return normalizeDigits(text)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/(.)\1{2,}/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Detect primary language of a user query or knowledge snippet. */
export function detectLanguage(text: string): QueryLanguage {
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if (hasArabic && hasLatin) return "mixed";
  if (hasArabic) return "ar";
  return "en";
}

/**
 * Common conversational filler & Egyptian/MSA question words excluded from content matching.
 * Domain words (e.g., "سعر", "عروض", "خدمات", "جلسات") are first inspected by intent classification
 * before filler stripping removes question framing.
 */
const RAW_STOP_WORDS = [
  // English fillers & framing
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
  "please", "need", "want", "know", "details", "info", "much", "many",
  "explain", "meaning", "difference", "best", "better", "used", "uses",
  "benefits", "pros", "cons", "suitable", "work", "done", "types", "kinds",
  // MSA & Egyptian colloquial Arabic fillers & question particles
  "في", "من", "على", "عن", "إلى", "الى", "حتى", "ما", "هي", "هو", "هل", "هم",
  "مع", "أو", "او", "التي", "الذي", "هذا", "هذه", "كيف", "ماذا", "كم",
  "ان", "أن", "إن", "لا", "لم", "لن", "قد", "كل", "فقط", "بين", "عند", "ال",
  "ايه", "إيه", "بكام", "بكم", "كام", "فين", "امتى", "إمتى", "ازاي", "إزاي",
  "ممكن", "عايز", "عايزة", "عايزه", "عايزين", "محتاج", "محتاجة", "محتاجه", "محتاجين",
  "لو", "سمحت", "يعني", "عباره", "عبارة", "شرح", "فكره", "فكرة",
  "قولي", "قوللي", "عرفني", "عرفوني", "احكيلي", "عندكم", "عندنا", "موجود", "موجوده",
  "متاح", "متاحه", "متوفر", "متوفره", "بتاع", "بتاعت", "بتاعه",
  "بتعملوا", "بتعملو", "بتعمل", "بيعمل", "بيستخدم", "بتستخدم", "بيتعمل", "بتتعمل",
  "طريقه", "طريقة", "مميزات", "مميزاته", "مميزاتها", "عيوب", "عيوبه", "عيوبها",
  "انهي", "أنهي", "اني", "احسن", "أحسن", "افضل", "أفضل", "مناسب", "مناسبه",
  "ينفع", "تنفع", "مينفعش", "عشان", "عشن", "لايه", "للايه", "بايه", "الفرق", "فرق",
  "سعر", "سعره", "سعرها", "اسعار", "اسعاره", "تكلفه", "تكلفته", "عرض", "عروض",
  "مواصفات", "تفاصيل", "تفاصيله", "معلومات", "عميل", "بيسأل", "بيسال",
  "فيه", "منه", "منها", "عليه", "عليها", "كده", "النهارده", "حالا", "تاني", "تانيه",
];

export const STOP_WORDS = new Set(RAW_STOP_WORDS.map((w) => normalizeText(w)));

export const SHORT_DOMAIN_ACRONYMS = new Set([
  "ha", "rf", "uv", "2d", "3d", "6d", "7d", "co2", "prp", "pdo", "aed", "bbl", "cyj", "tca", "bp",
]);

/** Protected Arabic root words beginning with "ال" that must never have "ال" stripped as a definite article. */
const PROTECTED_AL_WORDS = new Set([
  "الوان", "الم", "الله", "الام", "اليه", "الي", "الات", "اليات",
]);

/**
 * Strip common Arabic definite articles and proclitic prefixes safely (`ال`, `وال`, `بال`, `كال`, `فال`, `لل`)
 * without altering unrelated roots.
 */
export function stripArabicPrefix(word: string): string {
  if (!/^[\u0600-\u06FF]+$/.test(word) || PROTECTED_AL_WORDS.has(word)) {
    return word;
  }

  for (const prefix of ["وال", "بال", "كال", "فال", "ولل"]) {
    if (word.startsWith(prefix) && word.length - prefix.length >= 3) {
      return word.slice(prefix.length);
    }
  }

  if (word.startsWith("لل") && word.length - 2 >= 3) {
    return word.slice(2);
  }

  if (word.startsWith("ال") && word.length - 2 >= 3) {
    return word.slice(2);
  }

  return word;
}

/** Check whether token or its prefix-stripped stem is a conversational stop word. */
export function isStopWord(normalizedToken: string): boolean {
  if (!normalizedToken) return true;
  if (STOP_WORDS.has(normalizedToken)) return true;
  const stem = stripArabicPrefix(normalizedToken);
  return stem !== normalizedToken && STOP_WORDS.has(stem);
}

/**
 * Extract normalized domain tokens from a user query or knowledge text.
 * Resolves Arabic definite-article prefixes cleanly (`الفيشيال` -> `فيشيال`, `للحامل` -> `حامل`)
 * and filters conversational filler without losing short medical acronyms.
 */
export function tokenizeQuery(text: string): string[] {
  const norm = normalizeText(text);
  const rawParts = norm
    .replace(/[^\p{L}\p{N}+\s.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter(Boolean);

  const tokens: string[] = [];
  for (const part of rawParts) {
    if (isStopWord(part)) continue;

    const stemmed = /^[\u0600-\u06FF]+$/.test(part)
      ? stripArabicPrefix(part)
      : part;

    if (!stemmed || isStopWord(stemmed)) continue;

    if (/^[a-z0-9+.-]+$/.test(stemmed)) {
      if (stemmed.length >= 3 || SHORT_DOMAIN_ACRONYMS.has(stemmed)) {
        tokens.push(stemmed);
      }
    } else if (stemmed.length >= 2) {
      tokens.push(stemmed);
    }
  }

  return Array.from(new Set(tokens));
}
