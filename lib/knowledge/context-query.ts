/**
 * Conversation follow-up query resolution.
 * Resolves anaphoric Arabic and English follow-up questions using recent turn context
 * WITHOUT treating prior assistant prose as an authoritative source of facts.
 */

import { tokenizeQuery } from "./normalize";

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

const FOLLOWUP_PATTERNS =
  /(?:قارنلي|قارن\s*بين|أول|اول\s*(?:جهازين|نوعين|اتنين|منتجين)|الاتنين|الاثنين|بينهم|سعره|سعرها|بكام\s*(?:هو|هي|ده|دي)|تفاصيل\s*اكتر|العياده\s*دي|المقارنه|compare\s*(?:them|those|the\s*first\s*two|first\s*two)|the\s*first\s*two|that\s*(?:device|product|clinic|service|one)|its\s*price|which\s*(?:clinic|one)|tell\s*me\s*more)/i;

const ENTITY_HINT_WORDS =
  /\b(?:Candela|GentleMax|Cynosure|Deka|Quanta|Juvederm|Voluma|Volux|Restylane|Teosyal|Radiesse|Sculptra|Profhilo|Jalupro|Exofecta|Botox|Dysport|Nabota|Xeomin|Aptos|PDO|Rainbow|Hydrafacial|Dermapen|Vivace|Opatra|Endolift|Z-Lipo|Z-Wave|HIFU|Cool\s*Shaping|Wegovy|Snap-On|Night\s*Guard|Veneer|Dermadent|Well\s*Touch|One\s*Touch|New\s*Age|PRP|CYJ|ليزر|بوتوكس|فيلر|خيوط|هايدرافيشال|ديرمابن|فينير|تقشير)\b/gi;

export interface ContextualQueryResult {
  effectiveQuery: string;
  usedContext: boolean;
  extractedAnchors: string[];
}

export function resolveContextualQuery(
  currentMessage: string,
  history: ConversationTurn[] = []
): ContextualQueryResult {
  const cleanedCurrent = currentMessage.trim();
  if (!cleanedCurrent || history.length === 0) {
    return {
      effectiveQuery: cleanedCurrent,
      usedContext: false,
      extractedAnchors: [],
    };
  }

  const tokens = tokenizeQuery(cleanedCurrent);
  const looksLikeFollowUp =
    FOLLOWUP_PATTERNS.test(cleanedCurrent) ||
    (tokens.length <= 2 && history.length > 0);

  if (!looksLikeFollowUp) {
    return {
      effectiveQuery: cleanedCurrent,
      usedContext: false,
      extractedAnchors: [],
    };
  }

  const recentTurns = history.slice(-4);
  const anchors = new Set<string>();

  // First extract explicit brand/device entities mentioned in recent turns
  for (const turn of recentTurns) {
    const matches = turn.content.match(ENTITY_HINT_WORDS) || [];
    for (const m of matches) {
      anchors.add(m.trim());
    }
  }

  // Fallback to content tokens from the previous user question
  const lastUserTurn = [...recentTurns].reverse().find((t) => t.role === "user");
  const anchorList = Array.from(anchors).slice(0, 6);

  if (anchorList.length === 0 && lastUserTurn) {
    const prevTokens = tokenizeQuery(lastUserTurn.content).slice(0, 5);
    prevTokens.forEach((t) => anchors.add(t));
  }

  const finalAnchors = Array.from(anchors).slice(0, 6);
  if (finalAnchors.length === 0) {
    return {
      effectiveQuery: cleanedCurrent,
      usedContext: false,
      extractedAnchors: [],
    };
  }

  return {
    effectiveQuery: `${cleanedCurrent} ${finalAnchors.join(" ")}`,
    usedContext: true,
    extractedAnchors: finalAnchors,
  };
}

