/**
 * Bilingual synonym, transliteration, Egyptian-Arabic alias, and common typo map.
 * Carefully curated to match domain terms present in the Terra Solutions dataset
 * without causing false positives across unrelated topics.
 */

import { normalizeText } from "./normalize";

export const SYNONYM_MAP: Record<string, string[]> = {
  // Fillers & brands
  filler: ["فيلر", "فلر", "dermal filler"],
  fillers: ["فيلر", "فلر", "filler"],
  filer: ["filler", "فيلر", "فلر"],
  juviderm: ["juvederm"],
  teoxane: ["teosyal"],
  radiese: ["radiesse", "رادياس"],
  رادياس: ["radiesse", "calcium filler"],
  فيلر: ["filler", "فلر"],
  فلر: ["filler", "فيلر"],

  // Botox & brands
  botox: ["بوتوكس", "بوتكس"],
  botoks: ["botox", "بوتوكس", "بوتكس"],
  بوتوكس: ["botox", "بوتكس"],
  بوتكس: ["botox", "بوتوكس"],
  ديسبورت: ["dysport"],
  نابوتا: ["nabota"],
  زيومين: ["xeomin"],

  // Threads
  thread: ["خيوط", "threads", "pdo", "aptos", "rainbow"],
  threads: ["خيوط", "thread", "pdo", "aptos", "rainbow"],
  خيوط: ["threads", "pdo", "aptos", "rainbow"],

  // Laser hair removal
  laser: ["ليزر", "candela", "cynosure", "deka", "quanta"],
  lazer: ["laser", "ليزر"],
  removel: ["removal", "ازاله"],
  removal: ["ازاله", "إزالة"],
  كانديلا: ["candela", "gentlemax"],
  سايناشور: ["cynosure"],
  ليزر: ["laser"],

  // Hair & face treatments
  hair: ["شعر", "الشعر", "cyj", "prp"],
  شعر: ["hair", "prp", "cyj"],
  بلازما: ["prp", "platelet"],
  prp: ["بلازما"],
  ميزوثيرابي: ["mesotherapy"],
  mesotherapy: ["ميزوثيرابي"],
  stem: ["خلايا جذعية", "stem cells"],
  جذعيه: ["stem cells", "الخلايا الجذعية"],
  face: ["وجه", "الوجه", "بشرة", "بشره"],
  skin: ["بشرة", "بشره", "جلد"],
  بشره: ["skin", "face", "facial"],
  وجه: ["face", "facial"],

  // Skin boosters & collagen stimulators
  booster: ["نضارة", "skin booster", "profhilo", "jalupro", "exofecta"],
  boosters: ["نضارة", "skin booster", "profhilo", "jalupro"],
  بروفايلو: ["profhilo"],
  جالوبرو: ["jalupro"],
  اكزوفكتا: ["exofecta"],
  سكلبترا: ["sculptra"],
  sculptera: ["sculptra"],
  نضاره: ["skin booster", "exofecta", "profhilo", "نضارة"],
  collagen: ["كولاجين"],
  كولاجين: ["collagen"],

  // Facial & peeling
  facial: ["فيشال", "hydrafacial", "dermapen", "peeling", "factor five"],
  فيشال: ["facial", "hydrafacial"],
  hydra: ["hydrafacial", "هايدرافيشال", "هايدرا فيشال"],
  hydrafacial: ["فيشال", "هايدرافيشال", "هايدرا فيشال"],
  هايدرافيشال: ["hydrafacial"],
  dermapen: ["ديرمابن", "microneedling"],
  ديرمابن: ["dermapen", "microneedling"],
  peeling: ["تقشير", "peels", "tca"],
  تقشير: ["peeling", "tca"],

  // Tattoo & microblading
  tattoo: ["تاتو", "وشم", "q-switch", "microblading"],
  tatoo: ["tattoo", "تاتو"],
  تاتو: ["tattoo", "microblading"],
  وشم: ["tattoo", "تاتو"],
  microblading: ["مايكروبليدينغ", "ديرمادنت", "dermadent"],
  مايكروبليدينغ: ["microblading", "dermadent"],

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

  // Slimming & body devices
  slimming: ["تنحيف", "تخسيس", "دهون", "wegovy", "lipolysis", "z-lipo", "hifu", "endolift"],
  تنحيف: ["slimming", "wegovy", "lipolysis", "z-lipo"],
  تخسيس: ["slimming", "wegovy", "lipolysis"],
  دهون: ["slimming", "lipolysis", "z-lipo", "cool shaping"],
  وزن: ["wegovy", "slimming"],
  weight: ["wegovy", "slimming"],
  هيفو: ["hifu"],
  اندولفت: ["endolift"],
  ويجوفي: ["wegovy"],
  فيفاشي: ["vivace"],
  فيفاتشي: ["vivace"],

  // Dental
  dental: ["اسنان", "أسنان", "veneer", "night guard", "snap-on"],
  teeth: ["اسنان", "أسنان", "dental", "veneer"],
  veneer: ["فينير", "فينيير", "veneers", "e-max"],
  veneers: ["فينير", "فينيير", "veneer", "e-max"],
  braces: ["تقويم", "orthodontics"],
  orthodontics: ["تقويم"],
  implants: ["زراعة", "implant"],
  اسنان: ["dental", "teeth", "veneer"],
  فينير: ["veneer", "veneers"],
  فينيير: ["veneer", "veneers"],
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
  dermadent: ["demadent", "ديرمادنت"],
  ديرمادنت: ["dermadent", "demadent"],
  welltouch: ["well touch"],
  onetouch: ["one touch"],
  device: ["جهاز", "اجهزة", "أجهزة", "machine"],
  devices: ["جهاز", "اجهزة", "أجهزة", "machines"],
  جهاز: ["device", "machine"],
  اجهزه: ["devices", "machines"],
};

/** Return normalized synonyms for a single normalized token. */
export function getTokenSynonyms(token: string): string[] {
  const list = SYNONYM_MAP[token];
  if (!list) return [];
  const out = new Set<string>();
  for (const s of list) {
    const norm = normalizeText(s);
    if (norm && norm !== token) {
      out.add(norm);
    }
  }
  return Array.from(out);
}

/** Expand query tokens with normalized bilingual synonyms. */
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
