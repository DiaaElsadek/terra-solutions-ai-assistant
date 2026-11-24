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

export interface StarterPromptItem {
  id: string;
  category: "services" | "prices" | "devices" | "clinics" | "compare";
  categoryLabel: string;
  text: string;
  textAr: string;
  query: string;
  icon:
    | "Sparkles"
    | "Tag"
    | "Cpu"
    | "Building2"
    | "GitCompareArrows"
    | "ShieldAlert";
}

/** Category filters displayed on the welcome screen. */
export const WELCOME_PROMPT_CATEGORIES = [
  { id: "all", label: "All Topics" },
  { id: "services", label: "Services & Care" },
  { id: "prices", label: "Prices & Offers" },
  { id: "devices", label: "Devices & Tech" },
  { id: "clinics", label: "Clinics" },
  { id: "compare", label: "Compare & Safety" },
] as const;

export type WelcomePromptCategoryId =
  (typeof WELCOME_PROMPT_CATEGORIES)[number]["id"];

/** Verified starter prompts grounded in Terra Solutions operational records. */
export const SUGGESTED_PROMPTS: readonly StarterPromptItem[] = [
  {
    id: "under-eye-filler",
    category: "services",
    categoryLabel: "Services",
    text: "What filler is suitable for under-eye treatment?",
    textAr: "ما هو الفيلر المناسب تحت العين؟",
    query: "ما هو الفيلر المناسب تحت العين؟",
    icon: "Sparkles",
  },
  {
    id: "aptos-cat-eye-price",
    category: "prices",
    categoryLabel: "Prices & Offers",
    text: "What is the price of Aptos Cat Eye threads?",
    textAr: "سعر خيوط Aptos Cat Eye كام؟",
    query: "سعر خيوط Aptos Cat Eye كام؟",
    icon: "Tag",
  },
  {
    id: "candela-specs",
    category: "devices",
    categoryLabel: "Devices",
    text: "Candela GentleMax Pro Plus specifications",
    textAr: "مواصفات جهاز Candela GentleMax Pro Plus",
    query: "Candela GentleMax Pro Plus specifications",
    icon: "Cpu",
  },
  {
    id: "dermadent-clinic",
    category: "clinics",
    categoryLabel: "Clinics",
    text: "What devices and services are available at Dermadent?",
    textAr: "ما الخدمات والأجهزة المتوفرة في عيادة Dermadent؟",
    query: "What devices and services are available at Dermadent?",
    icon: "Building2",
  },
  {
    id: "compare-botox-filler",
    category: "compare",
    categoryLabel: "Compare",
    text: "Compare Botox and Filler treatments",
    textAr: "قارن بين البوتوكس والفيلر",
    query: "قارن بين البوتوكس والفيلر",
    icon: "GitCompareArrows",
  },
  {
    id: "botox-pregnancy",
    category: "compare",
    categoryLabel: "Safety",
    text: "Is Botox permitted during pregnancy?",
    textAr: "هل البوتوكس مسموح للحامل؟",
    query: "هل البوتوكس مسموح للحامل؟",
    icon: "ShieldAlert",
  },
];

export const KNOWLEDGE_NOT_FOUND_RESPONSE = UNAVAILABLE_KNOWLEDGE_MESSAGES.en;
