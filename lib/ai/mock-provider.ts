/**
 * Knowledge-aware mock AI provider.
 *
 * Performs REAL bilingual retrieval against the supplied Terra Solutions
 * Excel dataset and formats structured, call-center-ready Markdown responses.
 *
 * Clearly marked as "Knowledge Search Mode" — never fabricates prices,
 * promotions, clinic addresses, or medical suitability claims.
 */

import type { AIProvider, AIRequest, AIResponse, AIProviderConfig } from "./types";
import type { MessageSource } from "@/types";
import { knowledgeEngine, normalizeText } from "@/lib/knowledge";
import { CATEGORIES } from "@/lib/knowledge/categories";
import { KNOWLEDGE_NOT_FOUND_RESPONSE, WELCOME_MESSAGE } from "@/constants/prompts";

const config: AIProviderConfig = {
  name: "Terra Knowledge Search (Local Mode)",
  isMock: true,
  maxContextLength: 8000,
};

function isArabicQuery(query: string): boolean {
  return /[\u0600-\u06FF]/.test(query);
}

/** Build a structured devices overview from verified sheets. */
function handleDevicesIntent(arabic: boolean): AIResponse {
  const laserDevices = knowledgeEngine
    .getByCategory("laser")
    .filter((r) => r.title.includes("Devices") || r.content.includes("كانديلا"));
  const facialMachines = knowledgeEngine.getByCategory("facial-machines");
  const slimmingDevices = knowledgeEngine
    .getByCategory("slimming")
    .filter(
      (r) =>
        !/Wegovy|Lipolysis/i.test(r.title)
    );
  const tattooRecords = knowledgeEngine.getByCategory("tattoo-removal");

  const sources: MessageSource[] = [
    { category: "Laser Hair Removal", title: "Laser Devices", type: "knowledge" },
    { category: "Facial Machines & Devices", title: "Facial Machines", type: "knowledge" },
    { category: "Slimming & Body Contouring", title: "Body & Slimming Devices", type: "knowledge" },
    { category: "Tattoo Removal", title: "Clinic Tattoo Devices", type: "knowledge" },
  ];

  const laserBlock = laserDevices.map((r) => `#### ${r.title}\n${r.content}`).join("\n\n");
  const facialList = facialMachines
    .map((r) => `- **${r.title}** — ${r.content.split("\n")[0]}`)
    .join("\n");
  const slimmingList = slimmingDevices
    .map((r) => `- **${r.title}** — ${r.content.split("\n")[0]}`)
    .join("\n");
  const tattooBlock = tattooRecords[0]?.content.split("معلومات مهمة")[0]?.trim() || "";

  const content = arabic
    ? `## الأجهزة المتوفرة في العيادات ومواصفاتها

### 1. أجهزة إزالة الشعر بالليزر
${laserBlock}

### 2. أجهزة البشرة والوجه (Facial Machines)
${facialList}

### 3. أجهزة التنحيف ونحت الجسم (Slimming Devices)
${slimmingList}

### 4. أجهزة إزالة التاتو حسب العيادة
${tattooBlock}

---
> **ملاحظة للكول سنتر:** اسألني عن أي جهاز بالاسم لعرض طريقة العمل والموانع والتعليمات الكاملة.
*المصدر: قاعدة بيانات Terra Solutions (أوراق: Laser, Facial Machines, Slimming, Tattoo Removal)*`
    : `## Available Clinic Devices & Specifications

### 1. Laser Hair Removal Devices
${laserBlock}

### 2. Facial & Skin Rejuvenation Machines
${facialList}

### 3. Slimming & Body Contouring Devices
${slimmingList}

### 4. Tattoo Removal Devices by Clinic
${tattooBlock}

---
> **Agent Tip:** Ask about any specific device by name (e.g., *Candela*, *Vivace*, *Clear + Brilliant*, *HIFU*, *Endolift*) for full operating instructions and contraindications.
*Source: Terra Solutions Knowledge Base (Laser, Facial Machines, Slimming, Tattoo Removal)*`;

  return { content, sources, provider: config.name, isMock: true };
}

/** Handle price, offer, and package queries strictly from verified records. */
function handlePricingIntent(arabic: boolean): AIResponse {
  const threadRecords = knowledgeEngine.getByCategory("threads");
  const tattooRecords = knowledgeEngine.getByCategory("tattoo-removal");
  const dentalRecords = knowledgeEngine.getByCategory("dental");

  const sources: MessageSource[] = [
    { category: "Face Threads", title: "Thread Types & Pricing", type: "knowledge" },
    { category: "Tattoo Removal", title: "Tattoo Removal Pricing Policy", type: "knowledge" },
    { category: "Dental Services", title: "Veneer Pricing Guidance", type: "knowledge" },
  ];

  const content = arabic
    ? `## الأسعار والمعلومات المالية المتوفرة في قاعدة البيانات

فيما يلي **فقط** الأسعار والسياسات السعرية الموثّقة في ملف المعرفة الحالي:

| الخدمة / المنتج | السعر / السياسة الموثّقة | المصدر |
| --- | --- | --- |
| **Aptos Cat Eye Threads** | **5,000 AED** | Filler+Botox+Threads |
| **Aptos Lifting Threads** | **8,000 AED** | Filler+Botox+Threads |
| **Rainbow Mono Threads** | **70 AED** للخيط الواحد | Filler+Botox+Threads |
| **PDO Threads** | **299 AED** للخيط الواحد | Filler+Botox+Threads |
| **إزالة التاتو (Tattoo Removal)** | كل الأسعار تبدأ حسب حجم الوشم ولونه | Tattoo Removal |
| **كريم التخدير (Laser)** | مجاني حسب طلب المريض | Laser |
| **Veneers (ابتسامات الأسنان)** | يزداد السعر كلما زادت التفاصيل الطبيعية والشفافية (من 2D إلى Diamond Feldspathic) | Dental |

> **تنبيه هام:** **العروض الحالية وأسعار الباقات الكاملة** لباقي الخدمات (الفيلر، البوتوكس، الليزر، الفيشال، إلخ) غير متوفرة في ملف البيانات المرفق. يرجى مراجعة قائمة الأسعار المعتمدة في النظام أو مدير العيادة قبل تأكيد أي سعر للعميل.

*المصدر: قاعدة بيانات Terra Solutions*`
    : `## Verified Pricing & Offer Information

Below are the **only** verified prices and pricing notes present in the supplied knowledge base:

| Service / Product | Verified Price / Pricing Rule | Source Sheet |
| --- | --- | --- |
| **Aptos Cat Eye Threads** | **5,000 AED** | Filler+Botox+Threads |
| **Aptos Lifting Threads** | **8,000 AED** | Filler+Botox+Threads |
| **Rainbow Mono Threads** | **70 AED** per thread | Filler+Botox+Threads |
| **PDO Threads** | **299 AED** per thread | Filler+Botox+Threads |
| **Tattoo Removal** | Prices start based on tattoo size and color | Tattoo Removal |
| **Laser Numbing Cream** | Free upon patient request | Laser |
| **Dental Veneers** | Cost increases with natural detail & layering (2D → Diamond Feldspathic) | Dental |

> **Unavailable Information Notice:** Current promotional **offers, package prices, and full price lists** for other services (Fillers, Botox, Laser sessions, Facials, etc.) are **not included** in the supplied Excel knowledge base. Please check with the clinic price sheet or supervisor before quoting unverified prices.

*Source: Terra Solutions Knowledge Base (${threadRecords.length + tattooRecords.length + dentalRecords.length} related records checked)*`;

  return { content, sources, provider: config.name, isMock: true };
}

/** Handle clinic-specific queries honestly. */
function handleClinicIntent(query: string, arabic: boolean): AIResponse | null {
  const norm = normalizeText(query);
  const mentionsClinic =
    /clinic|clinics|well\s*touch|new\s*age|demadent|dermadent|one\s*touch|عياد|ديرمادنت/.test(norm);

  if (!mentionsClinic) return null;

  const sources: MessageSource[] = [
    { category: "Tattoo Removal", title: "Clinics & Q-Switch Devices", type: "knowledge" },
    { category: "Slimming & Body Contouring", title: "Clinic Slimming Devices", type: "knowledge" },
  ];

  const clinicsData = [
    {
      name: "Well Touch (WellTouch)",
      match: /well\s*touch/.test(norm),
      details:
        "- **Tattoo Removal:** PV Laser (Q-Switch) — with all doctors\n- **Slimming:** Z-Lipo & Z-Wave (with Beauty Therapist)",
    },
    {
      name: "New Age",
      match: /new\s*age/.test(norm),
      details: "- **Tattoo Removal:** DEKA (Q-Switch) — with Dr. Mitra",
    },
    {
      name: "Demadent / Dermadent + VIP",
      match: /demadent|dermadent|ديرمادنت|vip/.test(norm),
      details:
        "- **Tattoo Removal:** PV Laser + SPECTRA (Q-Switch)\n- **Microblading Removal:** Available **exclusively at Dermadent** (case-by-case doctor consultation required)",
    },
    {
      name: "One Touch",
      match: /one\s*touch/.test(norm),
      details:
        "- **Tattoo Removal:** Q-Switch Ultralight — with all doctors\n- **Slimming & Body:** Cool Shaping (same as Z-Lipo), Lipozero (same as Z-Wave), HIFU, InBody InBalance 3D (Doctor + Beauty Therapist)",
    },
    {
      name: "All Clinics",
      match: false,
      details:
        "- **Endolift (French Dermacool 2025):** Available across **all clinics** (Doctors only)",
    },
  ];

  const specificMatches = clinicsData.filter((c) => c.match);
  const toShow = specificMatches.length > 0 ? specificMatches : clinicsData;

  const body = toShow.map((c) => `### ${c.name}\n${c.details}`).join("\n\n");

  const content = arabic
    ? `## معلومات العيادات الموثّقة في قاعدة البيانات

${body}

---
> **ملاحظة هامة:** قاعدة البيانات الحالية لا تحتوي على **عناوين العيادات أو أرقام الهواتف أو ساعات العمل**. المعلومات أعلاه تقتصر على الأجهزة والخدمات الموثّقة لكل عيادة في ملف البيانات.

*المصدر: Tattoo Removal & Slimming sheets*`
    : `## Verified Clinic Information

${body}

---
> **Unavailable Details:** Clinic street **addresses, phone numbers, and operating hours** are **not included** in the supplied Excel knowledge base. Only clinic-specific devices, doctors, and services are verified above.

*Source: Terra Solutions Knowledge Base (Tattoo Removal & Slimming sheets)*`;

  return { content, sources, provider: config.name, isMock: true };
}

/** Handle comparison queries. */
function handleComparisonIntent(query: string, arabic: boolean): AIResponse | null {
  const norm = normalizeText(query);
  const isCompare = /compare|comparison|difference|vs|versus|مقارن|قارن|الفرق/.test(norm);
  if (!isCompare) return null;

  // Check if query targets specific records
  const results = knowledgeEngine.search(query, { limit: 6 });

  // Built-in verified comparison tables in the dataset:
  if (/botox|بوتوكس|بوتكس/.test(norm) && /filler|فيلر|فلر/.test(norm)) {
    const botoxRecord = knowledgeEngine.getByCategory("botox")[0];
    return {
      content: `## Botox vs. Hyaluronic Fillers Comparison\n\n${botoxRecord?.content || ""}\n\n*Source: Filler+Botox+Threads sheet*`,
      sources: [{ category: "Botox", title: "Botox vs Fillers Comparison", type: "knowledge" }],
      provider: config.name,
      isMock: true,
    };
  }

  if (/hair|شعر|prp|cyj|stem/.test(norm)) {
    const comp = knowledgeEngine
      .getByCategory("hair-treatments")
      .find((r) => r.title.includes("مقارنة") || r.content.includes("Dr. CYJ Hair Filler"));
    if (comp) {
      return {
        content: `## Hair Injections Comparison\n\n${comp.content}\n\n*Source: Hair+face Treatments sheet*`,
        sources: [{ category: "Hair Treatments", title: comp.title, type: "knowledge" }],
        provider: config.name,
        isMock: true,
      };
    }
  }

  if (/collagen|كولاجين|sculptra|radiesse/.test(norm) && /filler|فيلر/.test(norm)) {
    const sb = knowledgeEngine
      .getByCategory("skin-boosters")
      .find((r) => r.title.includes("الكولاجين") || r.content.includes("الفرق بينها وبين الفيلر"));
    if (sb) {
      return {
        content: `## Collagen Stimulating Injections vs. Fillers\n\n${sb.content}\n\n*Source: Skin Booster sheet*`,
        sources: [{ category: "Skin Boosters", title: sb.title, type: "knowledge" }],
        provider: config.name,
        isMock: true,
      };
    }
  }

  // Generic comparison prompt ("Compare these two products" or "Compare two filler products")
  if (/these two|two filler|بين نوعين|منتجين/.test(norm) || results.length < 2) {
    const fillerRecord = knowledgeEngine.getByCategory("fillers")[0];
    if (/filler|فيلر/.test(norm) && fillerRecord) {
      return {
        content: arabic
          ? `## مقارنة منتجات الفيلر المتوفرة\n\nلتنفيذ مقارنة دقيقة، أي منتجين تحديدًا ترغب بمقارنتهما؟ إليك قائمة الفيلر المتوفرة في قاعدة البيانات:\n\n${fillerRecord.content}\n\n> **نصيحة:** اكتب مثلاً **"قارن بين Juvederm Voluma و Radiesse"**.\n\n*المصدر: Filler+Botox+Threads*`
          : `## Filler Products Available to Compare\n\nWhich two specific products would you like to compare? Here are the verified fillers in our knowledge base:\n\n${fillerRecord.content}\n\n> **Tip:** Ask e.g. *"Compare Juvederm Voluma and Radiesse"* or *"Compare Botox vs Fillers"* for a focused comparison.\n\n*Source: Filler+Botox+Threads sheet*`,
        sources: [{ category: "Dermal Fillers", title: fillerRecord.title, type: "knowledge" }],
        provider: config.name,
        isMock: true,
      };
    }

    return {
      content: arabic
        ? `## مقارنة المنتجات أو العلاجات\n\nمن فضلك حدد **اسمي المنتجين أو الخدمتين** اللتين ترغب بمقارنتهما (مثال:\n- *قارن بين البوتوكس والفيلر*\n- *قارن بين Z-Lipo و Cool Shaping*\n- *قارن بين Dr. CYJ و PRP للشعر*\n- *قارن بين Veneer 3D و VIP Lounge*)`
        : `## Product & Service Comparison\n\nCould you clarify **which two products or treatments** you'd like to compare?\n\n**Verified comparisons you can ask for right away:**\n- *Compare Botox vs. Fillers*\n- *Compare Collagen Stimulators vs. Fillers*\n- *Compare Dr. CYJ Hair Filler vs. PRP vs. Stem Cells*\n- *Compare Juvederm vs. Teosyal fillers*\n- *Compare Z-Lipo vs. Cool Shaping / Z-Wave vs. Lipozero*`,
      sources: [],
      provider: config.name,
      isMock: true,
    };
  }

  // Format top 2 results side-by-side
  const top = results.slice(0, 2);
  const sources: MessageSource[] = top.map((r) => ({
    category: CATEGORIES[r.record.category]?.nameEn || r.record.category,
    title: r.record.title,
    type: "knowledge",
  }));

  const content =
    `## Comparison: ${top.map((t) => t.record.title).join(" vs. ")}\n\n` +
    top
      .map(
        (t) =>
          `### ${t.record.title}\n**Category:** *${CATEGORIES[t.record.category]?.nameEn || t.record.category}*\n\n${t.record.content}`
      )
      .join("\n\n---\n\n") +
    `\n\n---\n*Source: Terra Solutions Knowledge Base*`;

  return { content, sources, provider: config.name, isMock: true };
}

/** Format standard knowledge search results into a structured call-center Markdown response. */
function formatKnowledgeResponse(
  query: string,
  results: ReturnType<typeof knowledgeEngine.search>,
  arabic: boolean
): { content: string; sources: MessageSource[] } {
  if (results.length === 0) {
    return { content: KNOWLEDGE_NOT_FOUND_RESPONSE, sources: [] };
  }

  const sources: MessageSource[] = [];
  const sections: string[] = [];

  for (const result of results.slice(0, 4)) {
    const record = result.record;
    const catInfo = CATEGORIES[record.category];

    sections.push(
      `### ${record.title}\n` +
        `**Category:** ${catInfo?.nameEn || record.category} (${catInfo?.nameAr || ""}) · **Source Sheet:** \`${record.source.sheet}\`\n\n` +
        record.content
    );

    sources.push({
      category: catInfo?.nameEn || record.category,
      title: record.title,
      type: "knowledge",
    });
  }

  const header = arabic
    ? `تم العثور على **${results.length}** ${results.length === 1 ? "نتيجة" : "نتائج"} موثّقة في قاعدة بيانات الشركة:\n`
    : `Found **${results.length}** verified match${results.length > 1 ? "es" : ""} in the company knowledge base:\n`;

  const askedPrice = /(?:price|prices|pricing|cost|offer|offers|سعر|اسعار|أسعار|عرض|عروض)/i.test(
    query
  );
  const hasVerifiedPriceInResults = results
    .slice(0, 4)
    .some((r) => /\bAED\b|الاسعار|سعر/i.test(r.record.content));

  const priceNote =
    askedPrice && !hasVerifiedPriceInResults
      ? arabic
        ? `\n\n> **ملاحظة حول السعر:** السعر المحدد لهذه الخدمة غير متوفر في قاعدة البيانات الحالية؛ يُرجى مراجعة قائمة الأسعار المعتمدة بالعيادة.`
        : `\n\n> **Pricing Notice:** Exact pricing or package offers for this item are **not listed** in the supplied Excel knowledge base. Please verify with the clinic price list.`
      : "";

  const safetyFooter = arabic
    ? `\n\n> **توجيه طبي:** للملاءمة الطبية الفردية أو موانع الاستخدام الخاصة بحالة العميل، يُرجى التحويل إلى الطبيب أو المختص بالعيادة.`
    : `\n\n> **Specialist Guidance:** For patient-specific medical suitability, contraindications, or diagnosis, refer the customer to a qualified clinic specialist.`;

  const content =
    header +
    "\n" +
    sections.join("\n\n---\n\n") +
    priceNote +
    safetyFooter +
    `\n\n*Source: Terra Solutions Official Excel Knowledge Base*`;

  return { content, sources };
}

export const mockProvider: AIProvider = {
  config,

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    // Brief delay for visual feedback
    await new Promise((r) => setTimeout(r, 450));

    const query = request.userMessage.trim();
    const arabic = isArabicQuery(query);
    const norm = normalizeText(query);

    // 1. Greetings
    if (/^(hi|hello|hey|مرحبا|اهلا|السلام عليكم|welcome|start|بداية)$/i.test(query)) {
      return {
        content: WELCOME_MESSAGE,
        sources: [],
        provider: config.name,
        isMock: true,
      };
    }

    // 2. Generic "this service" agent-script prompt
    if (
      /what should i tell a customer asking about this service|ماذا أقول لعميل يسأل عن خدمة محددة/i.test(
        query
      )
    ) {
      return {
        content: arabic
          ? `## نص جاهز لمكالمات الكول سنتر\n\nأي خدمة أو منتج يسأل عنه العميل تحديدًا؟ اكتب اسم الخدمة وسأعرض لك **الملخص السريع للكول سنتر، والموانع، والتعليمات قبل وبعد الجلسة**.\n\n**أمثلة يمكنك طلبها الآن:**\n- *ماذا أقول لعميل يسأل عن إزالة الشعر بالليزر؟*\n- *ماذا أقول لعميل يسأل عن البوتوكس أو الفيلر؟*\n- *ماذا أقول لعميل يسأل عن جلسات الحمل والرضاعة؟*\n- *ماذا أقول لعميل يسأل عن الفينير أو إزالة التاتو؟*`
          : `## Customer Call Script Helper\n\nWhich specific service or treatment is the customer asking about? Share the service name and I'll retrieve the **call center talking points, pre/post instructions, and contraindications**.\n\n**Try asking:**\n- *"What should I tell a customer asking about laser hair removal?"*\n- *"What should I tell a customer asking about Dermal Fillers or Botox?"*\n- *"What should I tell a customer asking about Hydrafacial or Dermapen?"*\n- *"What treatments are safe during pregnancy or lactation?"*`,
        sources: [],
        provider: config.name,
        isMock: true,
      };
    }

    // 3. Product/service catalog overview (strict match so specific questions aren't swallowed)
    if (
      /(?:what|which|show|list|ما|اعرض|اظهر).*(?:(?:do we|we currently|our|متوفره|نقدم|لدينا).*(?:products?|services?|categories|خدمات|منتجات|اقسام|فئات)|(?:products?|services?|categories|خدمات|منتجات|اقسام|فئات).*(?:do we|we currently|offer|available|متوفره|نقدم|لدينا))|^(?:products|services|categories|المنتجات|الخدمات)$/i.test(
        norm
      )
    ) {
      const categories = knowledgeEngine.getCategoriesWithCounts();
      const list = categories
        .filter((c) => c.recordCount > 0)
        .map(
          (c) =>
            `| **${c.nameEn}** | ${c.nameAr} | ${c.description} | ${c.recordCount} |`
        )
        .join("\n");

      return {
        content: `## Our Products & Services\n\nTerra Solutions' knowledge base covers the following verified service categories:\n\n| Category | القسم | Overview | Records |\n| --- | --- | --- | --- |\n${list}\n\n---\nAsk about any specific product, treatment, device, or safety question for full details.\n\n*Source: Terra Solutions Knowledge Base*`,
        sources: [],
        provider: config.name,
        isMock: true,
      };
    }

    // 4. Devices & specifications intent
    if (
      /(?:device|devices|machine|machines|specifications|specs|اجهزه|مواصفات)/i.test(norm) &&
      !/(candela|cynosure|deka|quanta|vivace|clear|oxygeneo|campomats|co2|plasmage|opatra|ultrasound|z-lipo|z-wave|hifu|venus|endolift|inbody|roblex|lipozero|cool shaping)/i.test(
        norm
      )
    ) {
      return handleDevicesIntent(arabic);
    }

    // 5. General offers & package prices intent (only when asking generally, not about an unrelated unknown subject)
    if (
      /(?:current offers|package prices|price list|all prices|عروض حاليه|العروض الحاليه|اسعار الباقات|قائمه الاسعار)/i.test(
        norm
      ) ||
      /^(?:offers?|prices?|pricing|الاسعار|العروض)$/i.test(norm)
    ) {
      return handlePricingIntent(arabic);
    }

    // 6. Clinic info intent
    const clinicResp = handleClinicIntent(query, arabic);
    if (clinicResp) return clinicResp;

    // 7. Comparison intent
    const compResp = handleComparisonIntent(query, arabic);
    if (compResp) return compResp;

    // 8. Standard knowledge retrieval
    const results = knowledgeEngine.search(query, { limit: 4 });
    const { content, sources } = formatKnowledgeResponse(query, results, arabic);

    return {
      content,
      sources,
      provider: config.name,
      isMock: true,
    };
  },
};
