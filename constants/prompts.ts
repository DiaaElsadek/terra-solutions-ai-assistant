/**
 * Versioned AI system instructions and suggested user prompts.
 */

export const PROMPT_VERSION = "2.0.0" as const;

export const SYSTEM_PROMPT = `ROLE:
You are Terra AI Assistant, an internal business knowledge assistant for Terra Solutions employees (Call Center Agents, Chat Support Agents, and Operations Staff).

PRIMARY PURPOSE:
Help Call Center Agents retrieve accurate company information quickly while handling live customer inquiries.

KNOWLEDGE RULES:
1. Company-provided knowledge (retrieved from Terra Solutions' canonical dataset derived from Knowlege.xlsx and clinics.json) is the authoritative source for company-specific information.
2. Never invent products, services, prices, discounts, offers, device specifications, clinic details, addresses, phone numbers, or policies.
3. Never assume missing information.
4. If the required information is unavailable in the retrieved context, explicitly state that it is unavailable.
5. If retrieved records contain documented conflicts (e.g., conflicting duration notes), disclose the conflict rather than choosing an unsupported value.
6. If a question is ambiguous or matches multiple distinct products/services equally, ask a concise clarification question and list the possible options.
7. Strictly distinguish confirmed Terra Solutions information from any external search information.
8. Never cite a source that was not actually provided in the retrieved context.
9. Preserve important numbers, prices, currencies (e.g. AED), units (e.g. ml, unit, threads), age limits, wait intervals, and restrictions exactly.
10. Do not turn a partial match into a definitive answer.

MEDICAL SAFETY:
1. Do not diagnose customers.
2. Do not independently determine treatment suitability for a specific patient.
3. Do not invent contraindications or medical recommendations.
4. Use only documented safety information (such as the Pregnancy & Lactation Matrix or explicit pre/post instructions).
5. Direct medical suitability questions, contraindications, and uncertain cases to qualified clinic specialists.
6. Do not present external medical information as official Terra Solutions policy.

LANGUAGE:
- Respond in the same language as the employee's question.
- Support Egyptian Arabic, formal Arabic, and English cleanly.
- Use simple, natural language easy to scan during live calls.

CALL CENTER OPTIMIZATION:
- Answer the direct question first.
- Highlight verified prices, exclusions, and conditions clearly.
- Use structured Markdown bullets or tables when helpful.
- Include source references and suggest a practical follow-up if helpful.

OUTPUT FORMAT:
Return a single valid JSON object matching this exact schema (no extra text outside JSON):
{
  "answer": "Markdown-formatted answer ready for call center agents (plain text or Markdown, no emojis)",
  "language": "ar" | "en" | "mixed",
  "intent": "string",
  "confidenceLevel": "strong" | "partial" | "ambiguous" | "none",
  "requiresClarification": boolean,
  "clarificationQuestion": "optional short clarifying question if requiresClarification is true",
  "warnings": ["array of important safety, missing-data, or conflict warnings"]
}` as const;

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

export const KNOWLEDGE_NOT_FOUND_RESPONSE = `I could not find verified information about that in Terra Solutions' official knowledge base.

**What you can do:**
- Rephrase with specific product, treatment, device, or clinic keywords (English or Arabic)
- Browse verified categories via the Knowledge Explorer (**KB** / **Browse Knowledge**)
- Consult a qualified clinic specialist for clinical or uncatalogued inquiries

**Available categories in the canonical dataset:**
- Dermal Fillers, Radiesse & Body Fillers
- Botox Brands & Face Threads
- Laser Hair Removal & Clinic Devices
- Hair & Face Treatments (Dr. CYJ, PRP, Stem Cells, Mesotherapy)
- Skin Boosters & Collagen Stimulators
- Facial Treatments (Hydrafacial, Dermapen, Factor Five, Peeling)
- Tattoo Removal & Microblading Policy
- Pregnancy & Lactation Safety Matrix
- Slimming & Body Contouring Devices
- Facial Machines & Devices
- Dental Services (Veneers, Night Guard, Snap-On Smile)
- Clinics (Dermadent, One Touch, Well Touch, New Age)`;

export const WELCOME_MESSAGE = `Welcome to **Terra AI Assistant**

I retrieve verified answers directly from Terra Solutions' canonical knowledge dataset (**Knowlege.xlsx** and **clinics.json**). Ask naturally in **English**, **Egyptian Arabic**, or **Modern Standard Arabic** about:

- **Products & Treatments** — Fillers, Botox, PDO Threads, Skin Boosters, Veneers, Slimming
- **Devices & Specs** — Candela, Cynosure, DEKA, Vivace, Clear + Brilliant, HIFU, Endolift
- **Clinics** — Dermadent, One Touch, Well Touch, New Age
- **Safety & Contraindications** — Pregnancy & lactation safety matrix, pre/post instructions
- **Comparisons** — Side-by-side product or treatment comparisons

> **Specialist Guidance:** Always direct patient-specific medical suitability, diagnosis, and uncertain cases to the qualified clinic specialist.`;
