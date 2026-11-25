/**
 * Arabic phonetic transliteration skeletonizer and controlled typo corrector.
 * Bridges colloquial phonetic Arabic spellings (e.g., فيشيال / فيشال / فيشيول / فيشيل / فشيال)
 * and minor typing mistakes back to verified canonical domain terms without aggressive false matching.
 */

import { stripArabicPrefix } from "./normalize";

/**
 * Map Arabic characters to a vowel-insensitive, loanword-tolerant phonetic consonant skeleton.
 * Unifies foreign phonetic ambiguities commonly written in Arabic:
 *   - ب / پ -> ب, ف / ڤ -> ف, ك / ق / گ -> ك, ت / ط -> ت, س / ص / ث -> س, ز / ذ / ظ -> ز
 *   - Long vowel carriers (ا / و / ي / ى / ه) collapsed cleanly so فيشيال, فيشال, فيشيول, فيشل, فيشيل -> فشل
 */
export function arabicPhoneticSkeleton(rawWord: string): string {
  const stem = stripArabicPrefix(rawWord.trim().toLowerCase())
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

  if (!/^[\u0600-\u06FF]+$/.test(stem)) return "";

  // Strip English plural suffix "-ز" on longer Arabic loanwords (e.g. فيشيلز -> فيشيل)
  const dePlural =
    stem.length >= 5 && stem.endsWith("ز") ? stem.slice(0, -1) : stem;

  const chars = Array.from(dePlural);
  const out: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    let ch = chars[i];
    // Canonicalize phonetic consonant equivalents
    if (ch === "پ") ch = "ب";
    else if (ch === "ڤ") ch = "ف";
    else if (ch === "گ" || ch === "ق") ch = "ك";
    else if (ch === "ط") ch = "ت";
    else if (ch === "ص" || ch === "ث") ch = "س";
    else if (ch === "ذ" || ch === "ظ") ch = "ز";
    else if (ch === "ض") ch = "د";
    else if (ch === "چ") ch = "ج";

    const isVowelCarrier = ch === "ا" || ch === "و" || ch === "ي" || ch === "ه";
    if (isVowelCarrier) {
      // Preserve initial alif/waw/ya only on short 3-letter words or leading 'ا'/'و' onset; omit internal loan vowels
      if (i === 0 && (ch === "ا" || ch === "و" || ch === "ي" || ch === "ه") && chars.length <= 4) {
        out.push(ch);
      }
      continue;
    }

    if (out[out.length - 1] !== ch) {
      out.push(ch);
    }
  }

  return out.join("");
}

/** Standard Levenshtein edit distance bounded early when lengths diverge past maxDist. */
export function editDistance(a: string, b: string, maxCap = 3): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > maxCap) return maxCap + 1;

  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      if (dp[j] < rowMin) rowMin = dp[j];
      prev = temp;
    }
    if (rowMin > maxCap) return maxCap + 1;
  }
  return dp[n];
}

/** Damerau-Levenshtein-friendly check allowing adjacent character transposition at cost 1 (e.g., facail -> facial). */
export function damerauDistance(a: string, b: string): number {
  const base = editDistance(a, b, 2);
  if (base <= 1 || a.length !== b.length) return base;
  // Check adjacent character swap equivalence (cost 1)
  let diffs = 0;
  let swapIdx = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffs++;
      if (swapIdx === -1) swapIdx = i;
    }
  }
  if (
    diffs === 2 &&
    swapIdx >= 0 &&
    swapIdx + 1 < a.length &&
    a[swapIdx] === b[swapIdx + 1] &&
    a[swapIdx + 1] === b[swapIdx]
  ) {
    return 1;
  }
  return base;
}

/**
 * Controlled fuzzy matching against a verified dictionary list.
 * Short tokens (<= 3 chars) never fuzzy-match; 4-5 char words require same first letter
 * and edit distance <= 1 (transposition-aware); 8+ char words allow <= 2.
 */
export function findControlledTypoMatch(
  token: string,
  vocabulary: readonly string[]
): string | null {
  if (!token || token.length < 4) return null;

  const isLatin = /^[a-z]+$/.test(token);
  const isArabic = /^[\u0600-\u06FF]+$/.test(token);
  if (!isLatin && !isArabic) return null;

  const maxDist = token.length <= 7 ? 1 : 2;
  let bestTarget: string | null = null;
  let bestDist = maxDist + 1;

  for (const candidate of vocabulary) {
    if (!candidate || candidate.length < 4) continue;
    if (isLatin && !/^[a-z]+$/.test(candidate)) continue;
    if (isArabic && !/^[\u0600-\u06FF]+$/.test(candidate)) continue;

    // 4-char typo guard: first letter must match, and 4-char words only match omitted-char 5-char words (botx->botox) or pure transpositions (skni->skin) — never 1-letter substitutions like cars->care
    if (token.length <= 4) {
      if (token[0] !== candidate[0]) continue;
      if (candidate.length === 4) {
        const sortedA = token.split("").sort().join("");
        const sortedB = candidate.split("").sort().join("");
        if (sortedA !== sortedB) continue;
      } else if (candidate.length !== 5) {
        continue;
      }
    }
    if (Math.abs(candidate.length - token.length) > maxDist) continue;

    const d = damerauDistance(token, candidate);
    if (d <= maxDist && d < bestDist) {
      bestDist = d;
      bestTarget = candidate;
      if (d === 1) break;
    }
  }

  return bestTarget;
}

