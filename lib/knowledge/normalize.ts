/**
 * Query and text normalization utilities supporting English, Modern Standard Arabic,
 * and common Egyptian Arabic colloquial queries.
 */

export type QueryLanguage = "ar" | "en" | "mixed";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Arabic-Indic numerals (٠-٩) to Western digits (0-9). */
export function normalizeDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

/**
 * Normalize Arabic and Latin text for consistent indexing and search.
 * Strips diacritics (tashkeel), tatweel, and normalizes alef/teh-marbuta/alef-maksura.
 */
export function normalizeText(text: string): string {
  return normalizeDigits(text)
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
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

/** Common conversational filler & question words excluded from content keyword scoring. */
export const STOP_WORDS = new Set([
  // English
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
  // Formal & Egyptian Arabic filler words
  "في", "من", "على", "عن", "إلى", "الى", "ما", "هي", "هو", "هل", "هم",
  "مع", "أو", "او", "التي", "الذي", "هذا", "هذه", "كيف", "ماذا", "كم",
  "ان", "أن", "إن", "لا", "لم", "لن", "قد", "كل", "فقط", "بين", "عند",
  "ايه", "إيه", "بكام", "كام", "فين", "امتى", "إمتى", "ازاي", "إزاي",
  "ممكن", "عايز", "عايزة", "عايزه", "محتاج", "محتاجه", "لو", "سمحت",
  "قولي", "عرفني", "عندكم", "عندنا", "موجود", "متاح", "بتاع", "بتاعت",
  "سعر", "اسعار", "عرض", "عروض", "مواصفات", "تفاصيل", "معلومات", "عميل", "بيسأل",
]);

export const SHORT_DOMAIN_ACRONYMS = new Set([
  "ha", "rf", "uv", "2d", "3d", "6d", "7d", "co2", "prp", "pdo", "aed", "bbl", "cyj",
]);

/** Extract normalized domain tokens from a user query or text. */
export function tokenizeQuery(text: string): string[] {
  const norm = normalizeText(text);
  const raw = norm
    .replace(/[^\p{L}\p{N}+\s.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => {
      if (!t || STOP_WORDS.has(t)) return false;
      if (/^[a-z0-9+.-]+$/.test(t)) {
        return t.length >= 3 || SHORT_DOMAIN_ACRONYMS.has(t);
      }
      return t.length >= 2;
    });

  return Array.from(new Set(raw));
}

