/**
 * Versioned AI system instructions and suggested user prompts.
 */

import {
  TERRA_PROMPT_VERSION,
  TERRA_SYSTEM_PROMPT,
  UNAVAILABLE_KNOWLEDGE_MESSAGES,
} from "@/lib/ai/prompts/terra-system-prompt";

export const PROMPT_VERSION = TERRA_PROMPT_VERSION;
export const SYSTEM_PROMPT = TERRA_SYSTEM_PROMPT;
export { UNAVAILABLE_KNOWLEDGE_MESSAGES };

/** Suggested prompts shown when starting a new conversation. */
export const SUGGESTED_PROMPTS = [
  {
    text: "What products and services do we currently offer?",
    textAr: "ما هي المنتجات والخدمات المتوفرة لدينا حالياً؟",
    icon: "Package" as const,
  },
  {
    text: "Show me the available devices and their specifications.",
    textAr: "أرني الأجهزة المتوفرة ومواصفاتها.",
    icon: "Cpu" as const,
  },
  {
    text: "What are the current offers and package prices?",
    textAr: "ما هي العروض والأسعار الحالية؟",
    icon: "Tag" as const,
  },
  {
    text: "Compare these two products.",
    textAr: "قارن بين منتجين.",
    icon: "GitCompareArrows" as const,
  },
  {
    text: "Find information about a specific clinic.",
    textAr: "ابحث عن معلومات حول عيادة محددة.",
    icon: "Building2" as const,
  },
  {
    text: "What should I tell a customer asking about this service?",
    textAr: "ماذا أقول لعميل يسأل عن خدمة محددة؟",
    icon: "MessageCircle" as const,
  },
] as const;

export const KNOWLEDGE_NOT_FOUND_RESPONSE = UNAVAILABLE_KNOWLEDGE_MESSAGES.en;
