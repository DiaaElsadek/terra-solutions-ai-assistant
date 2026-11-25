/**
 * Controlled conversation entity-state & follow-up query resolution.
 * Extracts active entities, categories, clinics, and comparison candidates from recent
 * conversation history without ever treating assistant prose as authoritative facts,
 * and cleanly resets stale context when the user shifts to a new service/topic.
 */

import { normalizeText, tokenizeQuery } from "./normalize";
import { classifyQuery } from "./intent";
import { resolveCanonicalEntities } from "./synonyms";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const FOLLOWUP_PATTERNS =
  /(?:قارنلي|قارن\s*بين|أول|اول\s*(?:جهازين|نوعين|اتنين|منتجين)|الاتنين|الاثنين|بينهم|سعره|سعرها|سعر\s*الجلسه|كام\s*سعر|بكام\s*(?:هو|هي|ده|دي)|بكام\b|تفاصيل\s*اكتر|انواع\s*تانيه|نوع\s*تاني|اشكال\s*تانيه|مميزاته|عيوبه|ممنوع|للحامل|فيها\b|هناك\b|العياده\s*دي|المقارنه|compare\s*(?:them|those|the\s*first\s*two|first\s*two)|the\s*first\s*two|that\s*(?:device|product|clinic|service|one)|its\s*price|other\s*types|more\s*details|tell\s*me\s*more|which\s*(?:clinic|one)|is\s*it\s*safe)/i;

const PRONOMINAL_LOCATION_FOLLOWUP =
  /(?:^|\s)(?:فيها|هناك|العياده\s*دي|there|that\s*clinic)(?:\s|$|[؟?.!,])/i;

const VARIANT_FOLLOWUP_PATTERNS =
  /(?:انواع\s*تانيه|نوع\s*تاني|بدائل|خيارات\s*تانيه|other\s*(?:types|options|variants|brands))/i;

const ENTITY_HINT_WORDS =
  /(?:Candela|GentleMax|Cynosure|Deka|Quanta|Juvederm|Voluma|Volux|Restylane|Teosyal|Radiesse|Sculptra|Profhilo|Jalupro|Exofecta|Botox|Dysport|Nabota|Xeomin|Aptos|PDO|Rainbow|Hydrafacial|Facial|Dermapen|Factor\s*Five|Peeling|Skin\s*Booster|Body\s*Contouring|Vivace|Opatra|Endolift|Z-Lipo|Z-Wave|HIFU|Cool\s*Shaping|Wegovy|Lipolysis|Snap-On|Night\s*Guard|Veneer|Dermadent|Well\s*Touch|One\s*Touch|New\s*Age|PRP|CYJ|ليزر|بوتوكس|بوتكس|فيلر|فلر|خيوط|فيشيال|فيشال|فيشيل|فيشل|فيشيول|فشيال|هايدرافيشال|هيدرافيشال|ديرمابن|فينير|تقشير|تاتو|مايكروبليدينغ|نضاره|نضارة|سكين\s*بوستر|سكلبترا|بروفايلو|اندولفت|هايفو|ويجوفي|تنحيف|تخسيس|بلازما|ميزوثيرابي)/gi;

export interface ConversationState {
  activeEntities: string[];
  activeCanonicalIds: string[];
  activeClinics: string[];
  asksVariants: boolean;
}

export interface ContextualQueryResult {
  effectiveQuery: string;
  usedContext: boolean;
  extractedAnchors: string[];
  state: ConversationState;
}

export function resolveContextualQuery(
  currentMessage: string,
  history: ConversationTurn[] = []
): ContextualQueryResult {
  const cleanedCurrent = currentMessage.trim();
  const emptyState: ConversationState = {
    activeEntities: [],
    activeCanonicalIds: [],
    activeClinics: [],
    asksVariants: false,
  };

  if (!cleanedCurrent || history.length === 0) {
    return {
      effectiveQuery: cleanedCurrent,
      usedContext: false,
      extractedAnchors: [],
      state: emptyState,
    };
  }

  const currentNorm = normalizeText(cleanedCurrent);
  const currentTokens = tokenizeQuery(cleanedCurrent);
  const currentEntityHints = resolveCanonicalEntities(currentTokens, currentNorm);
  const currentExplicitMatches = cleanedCurrent.match(ENTITY_HINT_WORDS) || [];
  const currentClass = classifyQuery(cleanedCurrent);

  const hasNewExplicitEntity =
    currentEntityHints.some((h) => h.relationshipType !== "parent_category") ||
    currentExplicitMatches.length > 0 ||
    currentClass.clinicHints.length > 0;

  const asksVariants = VARIANT_FOLLOWUP_PATTERNS.test(currentNorm);
  const asksPronominalClinic =
    PRONOMINAL_LOCATION_FOLLOWUP.test(currentNorm) &&
    currentClass.clinicHints.length === 0;
  const looksLikeFollowUp =
    (!hasNewExplicitEntity && FOLLOWUP_PATTERNS.test(cleanedCurrent)) ||
    (!hasNewExplicitEntity && currentTokens.length <= 2) ||
    asksVariants ||
    asksPronominalClinic;

  // Topic shift guard: if user named a brand new service/device (not referencing "them"/"first two"/"there"), keep query self-contained
  if (
    !looksLikeFollowUp ||
    (hasNewExplicitEntity &&
      !asksVariants &&
      !asksPronominalClinic &&
      !/قارنلي|أول\s*(?:جهازين|نوعين)|first\s*two/i.test(cleanedCurrent))
  ) {
    return {
      effectiveQuery: cleanedCurrent,
      usedContext: false,
      extractedAnchors: [],
      state: {
        activeEntities: currentExplicitMatches.map((m) => m.trim()),
        activeCanonicalIds: currentEntityHints.map((h) => h.canonicalId),
        activeClinics: currentClass.clinicHints,
        asksVariants,
      },
    };
  }

  const recentTurns = history.slice(-6);
  const anchors = new Set<string>();
  const canonicalIds = new Set<string>();
  const clinicIds = new Set<string>();

  for (const turn of [...recentTurns].reverse()) {
    const matches = turn.content.match(ENTITY_HINT_WORDS) || [];
    for (const m of matches) {
      anchors.add(m.trim());
    }
    const turnNorm = normalizeText(turn.content);
    const turnTokens = tokenizeQuery(turn.content);
    for (const h of resolveCanonicalEntities(turnTokens, turnNorm)) {
      canonicalIds.add(h.canonicalId);
      if (anchors.size < 6) {
        anchors.add(h.matchedTerm);
      }
    }
    const tc = classifyQuery(turn.content);
    tc.clinicHints.forEach((cid) => clinicIds.add(cid));
    if (anchors.size >= 4) break;
  }

  const lastUserTurn = [...recentTurns].reverse().find((t) => t.role === "user");
  if (anchors.size === 0 && lastUserTurn) {
    for (const t of tokenizeQuery(lastUserTurn.content).slice(0, 5)) {
      anchors.add(t);
    }
  }

  const finalAnchors = Array.from(anchors).slice(0, 6);
  if (finalAnchors.length === 0) {
    return {
      effectiveQuery: cleanedCurrent,
      usedContext: false,
      extractedAnchors: [],
      state: emptyState,
    };
  }

  return {
    effectiveQuery: `${cleanedCurrent} ${finalAnchors.join(" ")}`,
    usedContext: true,
    extractedAnchors: finalAnchors,
    state: {
      activeEntities: finalAnchors,
      activeCanonicalIds: Array.from(canonicalIds),
      activeClinics: Array.from(clinicIds),
      asksVariants,
    },
  };
}
