/**
 * Modular intent classification for Terra Solutions call-center queries.
 * Shared across local retrieval, structured LLM context construction, and fallback responses.
 */

import { normalizeText, detectLanguage, type QueryLanguage } from "./normalize";

export type QueryIntent =
  | "greeting"
  | "catalog_overview"
  | "device_specs"
  | "price_offer_lookup"
  | "clinic_lookup"
  | "comparison"
  | "safety_pregnancy"
  | "medical_diagnosis"
  | "call_script"
  | "company_info"
  | "product_service_lookup"
  | "unknown";

export interface ClassifiedQuery {
  raw: string;
  normalized: string;
  language: QueryLanguage;
  intent: QueryIntent;
  clinicHints: string[];
  unknownClinicRequested: boolean;
  asksPrice: boolean;
  asksComparison: boolean;
  asksSafety: boolean;
  asksClinic: boolean;
}

const GENERIC_CLINIC_MODIFIERS = new Set([
  "the", "a", "an", "this", "that", "these", "those", "which", "what", "any",
  "all", "each", "every", "our", "your", "their", "terra", "partner", "medical",
  "aesthetic", "dental", "laser", "slimming", "tattoo", "available", "in", "at",
  "of", "for", "from", "to", "each", "endolift", "hifu", "candela", "cynosure",
  "botox", "filler", "fillers", "veneer", "veneers", "microblading",
  "اي", "أي", "كل", "جميع", "هذا", "هذه", "تلك", "الاسنان", "اسنان",
  "ليزر", "تجميل", "تيرا", "التنحيف", "التاتو",
]);

function detectUnknownNamedClinic(
  raw: string,
  normalized: string,
  clinicHints: string[]
): boolean {
  if (clinicHints.length > 0) return false;
  const properEn = raw.match(
    /\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){0,2})\s+Clinic\b/
  );
  if (properEn?.[1]) {
    const words = properEn[1]
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter((w) => !GENERIC_CLINIC_MODIFIERS.has(w));
    if (words.length >= 1) return true;
  }
  const prepEn = normalized.match(
    /\b(?:at|in|from|visit)\s+([a-z]{3,}(?:\s+[a-z]{3,}){0,2})\s+clinic\b/i
  );
  if (prepEn?.[1]) {
    const words = prepEn[1]
      .trim()
      .split(/\s+/)
      .filter((w) => !GENERIC_CLINIC_MODIFIERS.has(w));
    if (words.length >= 1) return true;
  }
  const arMatch = normalized.match(/عياده\s+([\u0600-\u06FFa-z0-9]{3,})/i);
  if (arMatch?.[1] && !GENERIC_CLINIC_MODIFIERS.has(arMatch[1])) {
    return true;
  }
  return false;
}

const CLINIC_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  { id: "dermadent", regex: /dermadent|demadent|dermaden|ديرمادنت/i },
  { id: "well-touch", regex: /well\s*touch|ويل\s*تاتش/i },
  { id: "one-touch", regex: /one\s*touch|وان\s*تاتش/i },
  { id: "new-age", regex: /new\s*age|نيو\s*ايدج|dr\.?\s*mitra|ميترا/i },
];

export function classifyQuery(raw: string): ClassifiedQuery {
  const normalized = normalizeText(raw);
  const language = detectLanguage(raw);

  const clinicHints = CLINIC_PATTERNS.filter((c) => c.regex.test(normalized)).map(
    (c) => c.id
  );
  const unknownClinicRequested = detectUnknownNamedClinic(raw, normalized, clinicHints);

  const asksMedicalDiagnosis =
    /(?:\bdiagnos(?:e|is|ing)?\b|\bprescrib(?:e|ing)?\b|تشخيص|وصف دواء|وصف علاج)/i.test(
      normalized
    );

  const asksPrice =
    /(?:price|prices|pricing|cost|how much|aed|offer|offers|discount|package|packages|سعر|اسعار|بكام|كام|عرض|عروض|باقه|باقات|تكلفه)/i.test(
      normalized
    );

  const asksComparison =
    /(?:compare|comparison|difference|versus|\bvs\b|مقارن|قارن|الفرق|احسن|افضل بين)/i.test(
      normalized
    );

  const asksSafety =
    /(?:pregnan|lactat|breastfeed|safe|contraindic|side effect|حمل|حامل|رضاع|بترضع|مرضع|ممنوع|موانع|امان|امن|اضرار|اثار جانبيه)/i.test(
      normalized
    );

  const asksClinic =
    clinicHints.length > 0 ||
    /(?:clinic|clinics|branch|branches|location|address|phone|hours|عياده|عيادات|فرع|فروع|عنوان|رقم|مواعيد)/i.test(
      normalized
    );

  let intent: QueryIntent = "product_service_lookup";

  if (/^(hi|hello|hey|مرحبا|اهلا|السلام عليكم|welcome|start|بدايه)$/i.test(normalized)) {
    intent = "greeting";
  } else if (asksMedicalDiagnosis) {
    intent = "medical_diagnosis";
  } else if (
    /(?:what should i tell a customer asking about this service|ماذا اقول لعميل يسال عن خدمه محدده)/i.test(
      normalized
    )
  ) {
    intent = "call_script";
  } else if (
    /(?:what|which|show|list|ما|اعرض|اظهر).*(?:(?:do we|we currently|our|متوفره|نقدم|لدينا).*(?:products?|services?|categories|خدمات|منتجات|اقسام|فئات)|(?:products?|services?|categories|خدمات|منتجات|اقسام|فئات).*(?:do we|we currently|offer|available|متوفره|نقدم|لدينا))|^(?:products|services|categories|المنتجات|الخدمات)$/i.test(
      normalized
    )
  ) {
    intent = "catalog_overview";
  } else if (
    /(?:about terra|who is terra|what is terra solutions|من هي تيرا|عن الشركه|عن تيرا)/i.test(
      normalized
    )
  ) {
    intent = "company_info";
  } else if (asksComparison) {
    intent = "comparison";
  } else if (
    /(?:current offers|package prices|price list|all prices|عروض حاليه|العروض الحاليه|اسعار الباقات|قائمه الاسعار)/i.test(
      normalized
    ) ||
    /^(?:offers?|prices?|pricing|الاسعار|العروض)$/i.test(normalized)
  ) {
    intent = "price_offer_lookup";
  } else if (
    asksClinic &&
    !/(?:device|machine|laser|slimming|tattoo|microblading|تاتو|ليزر|تنحيف)/i.test(
      normalized
    )
  ) {
    intent = "clinic_lookup";
  } else if (
    /(?:device|devices|machine|machines|specifications|specs|اجهزه|مواصفات)/i.test(
      normalized
    ) &&
    !/(?:candela|cynosure|deka|quanta|vivace|clear|oxygeneo|campomats|co2|plasmage|opatra|ultrasound|z-lipo|z-wave|hifu|venus|endolift|inbody|roblex|lipozero|cool shaping)/i.test(
      normalized
    )
  ) {
    intent = "device_specs";
  } else if (asksSafety) {
    intent = "safety_pregnancy";
  } else if (asksClinic) {
    intent = "clinic_lookup";
  }

  return {
    raw,
    normalized,
    language,
    intent,
    clinicHints,
    unknownClinicRequested,
    asksPrice,
    asksComparison,
    asksSafety,
    asksClinic,
  };
}
