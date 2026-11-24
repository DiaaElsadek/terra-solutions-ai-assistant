/**
 * Deterministic Local Fallback Knowledge Engine.
 *
 * Activated automatically whenever Gemini is unconfigured, times out, hits rate limits,
 * returns an error, or produces invalid structured output.
 * Produces the exact same `RichAIResponse` schema (`meta.provider: "local_fallback"`)
 * without fabricating company prices, clinics, or medical recommendations.
 */

import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { CATEGORIES } from "@/lib/knowledge/categories";
import { UNAVAILABLE_KNOWLEDGE_MESSAGES } from "@/lib/ai/prompts/terra-system-prompt";
import { toSafeErrorMessage } from "@/lib/security/api-guard";
import type { KnowledgeRecord, RetrievalConfidence } from "@/types/knowledge";
import type { MessageSource } from "@/types";
import type {
  AIErrorCode,
  RichAIResponse,
  RichResponseBlock,
  VerifiedSourceReference,
} from "@/lib/ai/response-schema";
import { richResponseToMarkdown } from "@/lib/ai/response-schema";
import type {
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ProviderValidationResult,
} from "@/lib/ai/types";

const MODEL_ID = "terra-deterministic-rag-v2";

const config: AIProviderConfig = {
  id: "local_fallback",
  name: "Terra Local Knowledge Engine",
  isMock: true,
  model: MODEL_ID,
  maxContextChars: 7500,
};

function toMessageSources(records: KnowledgeRecord[]): MessageSource[] {
  return records.map((r) => ({
    category: CATEGORIES[r.category]?.nameEn || r.category,
    title: r.name,
    type: "knowledge",
    file: r.source.file,
    sheet: r.source.sheet,
    row: r.source.row,
    rows: r.source.rows,
  }));
}

function toVerifiedRefs(records: KnowledgeRecord[]): VerifiedSourceReference[] {
  return records.map((r) => ({
    recordId: r.id,
    sourceId: r.source.sourceId || "source-001",
    fileName: r.source.file,
    sheetName: r.source.sheet,
    rowNumber: r.source.row,
    title: r.name,
  }));
}

function toExternalSources(request: AIRequest): MessageSource[] {
  return (request.externalResults || []).map((ext) => ({
    category: "External Web",
    title: ext.title,
    type: "external",
    url: ext.url,
    snippet: ext.snippet,
    publishedAt: ext.publishedAt,
  }));
}

function appendExternalBlocks(
  blocks: RichResponseBlock[],
  request: AIRequest,
  arabic: boolean
): void {
  if (request.externalResults && request.externalResults.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "callout",
      tone: "info",
      title: arabic
        ? "مراجع خارجية ثانوية (غير تابعة لسياسة تيرا الرسمية)"
        : "External Web References (Secondary — Not Official Terra Policy)",
      text: request.externalResults
        .map((e) => `${e.title} — ${e.snippet} (${e.url})`)
        .join(" | "),
    });
  } else if (request.externalSearchNote) {
    blocks.push({
      type: "callout",
      tone: "muted",
      title: arabic ? "البحث الخارجي" : "External Search",
      text: request.externalSearchNote,
    });
  }
}

function buildFinalAIResponse(opts: {
  rich: RichAIResponse;
  sources: MessageSource[];
  externalSources: MessageSource[];
  intent: string;
  confidenceLevel: RetrievalConfidence;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  warnings: string[];
  errorCategory?: AIErrorCode;
  fallbackReason?: string;
}): AIResponse {
  const md = richResponseToMarkdown(opts.rich);
  return {
    answer: md,
    content: md,
    language: opts.rich.language,
    intent: opts.intent,
    confidenceLevel: opts.confidenceLevel,
    requiresClarification: opts.requiresClarification,
    clarificationQuestion: opts.clarificationQuestion,
    warnings: opts.warnings,
    structured: opts.rich,
    sources: opts.sources,
    externalSources: opts.externalSources,
    provider: config.name,
    isMock: true,
    fallbackUsed: true,
    errorCategory: opts.errorCategory,
  };
}

function buildRichDevicesResponse(
  request: AIRequest,
  arabic: boolean,
  lang: "ar" | "en" | "mixed"
): AIResponse {
  const laserDevs = knowledgeRetriever
    .getByCategory("laser")
    .filter((r) => r.recordType === "device");
  const facialDevs = knowledgeRetriever
    .getByCategory("facial-machines")
    .filter((r) => r.recordType === "device");
  const slimDevs = knowledgeRetriever
    .getByCategory("slimming")
    .filter((r) => r.recordType === "device");
  const tattooDevs = knowledgeRetriever
    .getByCategory("tattoo-removal")
    .filter((r) => r.recordType === "device");

  const allDevs = [...laserDevs, ...facialDevs, ...slimDevs, ...tattooDevs];
  const verifiedRefs = toVerifiedRefs(allDevs);

  const summary = arabic
    ? `تم استرجاع ${allDevs.length} جهازًا طبيًا وتجميليًا موثقًا في العيادات.`
    : `Retrieved ${allDevs.length} verified clinic devices across Laser, Facial, Slimming, and Tattoo Removal.`;

  const blocks: RichResponseBlock[] = [
    {
      type: "heading",
      level: 2,
      text: arabic
        ? "الأجهزة المتوفرة في العيادات ومواصفاتها"
        : "Available Clinic Devices & Specifications",
      tone: "accent",
    },
    {
      type: "metric",
      label: arabic ? "إجمالي الأجهزة الموثقة" : "Verified Clinic Devices",
      value: String(allDevs.length),
      tone: "info",
    },
    {
      type: "table",
      title: arabic ? "دليل الأجهزة حسب القسم" : "Device Directory by Department",
      columns: [
        { key: "category", label: arabic ? "القسم" : "Department" },
        { key: "name", label: arabic ? "الجهاز" : "Device" },
        { key: "source", label: arabic ? "المصدر" : "Source" },
      ],
      rows: allDevs.map((r) => ({
        category: arabic
          ? CATEGORIES[r.category]?.nameAr || r.category
          : CATEGORIES[r.category]?.nameEn || r.category,
        name: r.name,
        source: `${r.source.sheet} (R${r.source.row})`,
      })),
    },
    {
      type: "callout",
      tone: "info",
      title: arabic ? "نصيحة للبحث السريع" : "Quick Lookup Tip",
      text: arabic
        ? "اسأل عن أي جهاز بالاسم لعرض المواصفات الكاملة والموانع والعيادات المتاح بها."
        : "Ask about any device by name to inspect full specifications, contraindications, and clinic availability.",
    },
    {
      type: "source_list",
      title: arabic ? "المصادر المعتمدة" : "Approved Sources",
      items: verifiedRefs.slice(0, 6),
    },
  ];

  appendExternalBlocks(blocks, request, arabic);

  const rich: RichAIResponse = {
    schemaVersion: "1.0",
    language: lang,
    status: "success",
    answer: { summary, blocks },
    sources: verifiedRefs,
    meta: {
      provider: "local_fallback",
      model: MODEL_ID,
      grounded: verifiedRefs.length > 0,
    },
  };

  return buildFinalAIResponse({
    rich,
    sources: toMessageSources(allDevs),
    externalSources: toExternalSources(request),
    intent: "device_specs",
    confidenceLevel: "strong",
    requiresClarification: false,
    warnings: [],
  });
}

function buildRichPricingResponse(
  request: AIRequest,
  arabic: boolean,
  lang: "ar" | "en" | "mixed"
): AIResponse {
  const priced = knowledgeRetriever
    .getAllRecords()
    .filter((r) => (r.status ?? "active") === "active" && r.prices.length > 0);
  const refs = toVerifiedRefs(priced);

  const summary = arabic
    ? "عرض الأسعار الموثقة فقط في ملفات الشركة دون أي تقدير أو إضافة."
    : "Showing only prices explicitly recorded in Terra Solutions' official Excel knowledge base.";

  const rows: Array<Record<string, string>> = [];
  for (const r of priced) {
    for (const p of r.prices) {
      rows.push({
        item: r.name,
        price: p.note,
        source: `${r.source.sheet} (R${r.source.row})`,
      });
    }
  }

  const missingWarning = arabic
    ? "العروض الموسمية والأسعار غير المدرجة في الملف غير متوفرة في قاعدة البيانات — يُرجى الرجوع للإدارة/الفريق المختص."
    : "Services and seasonal offers not listed above have no fixed pricing in the Excel workbook — verify with the clinic team.";

  const blocks: RichResponseBlock[] = [
    {
      type: "heading",
      level: 2,
      text: arabic ? "الأسعار والباقات الموثقة" : "Verified Pricing & Packages",
      tone: "accent",
    },
    {
      type: "table",
      title: arabic ? "قائمة الأسعار المسجلة" : "Recorded Prices",
      columns: [
        { key: "item", label: arabic ? "الخدمة / المنتج" : "Service / Product" },
        { key: "price", label: arabic ? "السعر الموثق" : "Recorded Price", align: "end" },
        { key: "source", label: arabic ? "المصدر" : "Source" },
      ],
      rows,
    },
    {
      type: "callout",
      tone: "warning",
      title: arabic ? "تنبيه البيانات الناقصة" : "Missing Pricing Notice",
      text: missingWarning,
    },
    {
      type: "source_list",
      title: arabic ? "المصادر المعتمدة" : "Approved Sources",
      items: refs,
    },
  ];

  appendExternalBlocks(blocks, request, arabic);

  const rich: RichAIResponse = {
    schemaVersion: "1.0",
    language: lang,
    status: "partial",
    answer: { summary, blocks },
    sources: refs,
    meta: {
      provider: "local_fallback",
      model: MODEL_ID,
      grounded: refs.length > 0,
    },
  };

  return buildFinalAIResponse({
    rich,
    sources: toMessageSources(priced),
    externalSources: toExternalSources(request),
    intent: "price_offer_lookup",
    confidenceLevel: "partial",
    requiresClarification: false,
    warnings: [missingWarning],
  });
}

function buildRichClinicResponse(
  request: AIRequest,
  arabic: boolean,
  lang: "ar" | "en" | "mixed"
): AIResponse {
  const hints = request.retrieval.classified.clinicHints;
  const allClinics = knowledgeRetriever.getClinics();
  const targetClinics =
    hints.length > 0
      ? allClinics.filter((c) => hints.includes(c.id))
      : allClinics;

  const clinicRecs = knowledgeRetriever
    .getByCategory("clinics")
    .filter((r) => targetClinics.some((c) => c.id === r.clinicIds[0]));
  const refs = toVerifiedRefs(clinicRecs);

  const missingWarning = arabic
    ? "عناوين العيادات وأرقام الهواتف ومواعيد العمل غير متوفرة في ملفات الشركة الحالية."
    : "Clinic street addresses, phone numbers, and working hours are not provided in the supplied files.";

  const blocks: RichResponseBlock[] = [
    {
      type: "heading",
      level: 2,
      text: arabic
        ? "العيادات الموثقة والخدمات المتاحة"
        : "Documented Clinics & Capabilities",
      tone: "accent",
    },
    {
      type: "table",
      title: arabic ? "تفاصيل العيادات" : "Clinic Capabilities Overview",
      columns: [
        { key: "clinic", label: arabic ? "العيادة" : "Clinic" },
        { key: "services", label: arabic ? "الخدمات" : "Services" },
        { key: "devices", label: arabic ? "الأجهزة المسجلة" : "Documented Devices" },
        { key: "doctors", label: arabic ? "الأطباء المذكورون" : "Doctors" },
      ],
      rows: targetClinics.map((c) => ({
        clinic: c.name,
        services: c.services.join("، ") || "—",
        devices: c.devices.map((d) => d.device).join("، ") || "—",
        doctors: c.doctors.join("، ") || "—",
      })),
    },
    {
      type: "callout",
      tone: "warning",
      title: arabic ? "بيانات غير متوفرة بالملف" : "Unavailable Clinic Details",
      text: missingWarning,
    },
    {
      type: "source_list",
      title: arabic ? "المصادر" : "Sources",
      items: refs,
    },
  ];

  appendExternalBlocks(blocks, request, arabic);

  const rich: RichAIResponse = {
    schemaVersion: "1.0",
    language: lang,
    status: "partial",
    answer: {
      summary: targetClinics.map((c) => c.name).join(" · "),
      blocks,
    },
    sources: refs,
    meta: {
      provider: "local_fallback",
      model: MODEL_ID,
      grounded: refs.length > 0,
    },
  };

  return buildFinalAIResponse({
    rich,
    sources: toMessageSources(clinicRecs),
    externalSources: toExternalSources(request),
    intent: "clinic_lookup",
    confidenceLevel: "strong",
    requiresClarification: false,
    warnings: [missingWarning],
  });
}

export const localFallbackProvider: AIProvider = {
  config,

  validateConfiguration(): ProviderValidationResult {
    return { configured: true, providerId: "local_fallback" };
  },

  normalizeError(err: unknown): string {
    return toSafeErrorMessage(err);
  },

  async generateResponse(
    request: AIRequest,
    fallbackMeta?: { fallbackReason?: string; errorCategory?: AIErrorCode }
  ): Promise<AIResponse> {
    const retrieval = request.retrieval;
    const { classified, results, confidence } = retrieval;
    const lang = classified.language;
    const arabic = lang === "ar";
    const externalSources = toExternalSources(request);
    const metaBase = {
      provider: "local_fallback" as const,
      model: MODEL_ID,
      fallbackReason: fallbackMeta?.fallbackReason,
      errorCategory: fallbackMeta?.errorCategory,
    };

    const withFallbackMeta = (res: AIResponse): AIResponse => {
      if (res.structured) {
        res.structured.meta = {
          ...res.structured.meta,
          ...metaBase,
        };
      }
      res.errorCategory = fallbackMeta?.errorCategory;
      res.fallbackUsed = true;
      return res;
    };

    // 1. Greeting
    if (classified.intent === "greeting") {
      const summary = arabic
        ? "أهلًا بك في مساعد تيرا الذكي. اكتب سؤالك عن المنتجات، الأجهزة، الأسعار، العيادات، أو قواعد الأمان."
        : "Welcome to Terra AI Assistant. Ask about products, aesthetic devices, pricing, clinics, or clinical safety protocols.";
      return withFallbackMeta(
        buildFinalAIResponse({
          rich: {
            schemaVersion: "1.0",
            language: lang,
            status: "success",
            answer: {
              summary,
              blocks: [
                { type: "badge", label: "Terra Solutions Internal KB", tone: "accent" },
                { type: "paragraph", text: summary, tone: "default" },
                {
                  type: "list",
                  style: "bullet",
                  title: arabic ? "أمثلة للاستعلام" : "Quick Examples",
                  items: arabic
                    ? [
                        "ما هو الفيلر المناسب تحت العين؟",
                        "هل البوتوكس مسموح للحامل؟",
                        "مقارنة بين أجهزة الليزر",
                      ]
                    : [
                        "What are Candela GentleMax Pro Plus specs?",
                        "What treatments are safe during pregnancy?",
                        "Show verified prices for Aptos threads",
                      ],
                },
              ],
            },
            sources: [],
            meta: { ...metaBase, grounded: false },
          },
          sources: [],
          externalSources,
          intent: "greeting",
          confidenceLevel: "strong",
          requiresClarification: false,
          warnings: [],
        })
      );
    }

    // 2. Call script clarification
    if (classified.intent === "call_script") {
      const q = arabic
        ? "أي خدمة أو منتج يسأل عنه العميل تحديدًا؟"
        : "Which specific service or product is the customer asking about?";
      return withFallbackMeta(
        buildFinalAIResponse({
          rich: {
            schemaVersion: "1.0",
            language: lang,
            status: "clarification",
            answer: {
              summary: q,
              blocks: [
                { type: "heading", level: 2, text: arabic ? "مساعد نصوص المكالمات" : "Call Script Helper", tone: "accent" },
                { type: "paragraph", text: q, tone: "info" },
                {
                  type: "list",
                  style: "bullet",
                  items: arabic
                    ? ["إزالة الشعر بالليزر", "حقن البوتوكس أو الفيلر", "الأمان أثناء الحمل والرضاعة"]
                    : ["Laser Hair Removal", "Dermal Fillers or Botox", "Pregnancy & Lactation Safety"],
                },
              ],
            },
            sources: [],
            meta: { ...metaBase, grounded: false },
          },
          sources: [],
          externalSources,
          intent: "call_script",
          confidenceLevel: "ambiguous",
          requiresClarification: true,
          clarificationQuestion: q,
          warnings: [],
        })
      );
    }

    // 3. Catalog overview
    if (classified.intent === "catalog_overview") {
      const cats = knowledgeRetriever
        .getCategoriesWithCounts()
        .filter((c) => c.recordCount > 0 && c.id !== "clinics");
      const summary = arabic
        ? `تحتوي قاعدة البيانات المعتمدة على ${cats.length} أقسام رئيسية.`
        : `Terra Solutions' canonical knowledge base covers ${cats.length} primary service and device categories.`;

      return withFallbackMeta(
        buildFinalAIResponse({
          rich: {
            schemaVersion: "1.0",
            language: lang,
            status: "success",
            answer: {
              summary,
              blocks: [
                { type: "heading", level: 2, text: arabic ? "أقسام المنتجات والخدمات" : "Terra Solutions Products & Services", tone: "accent" },
                {
                  type: "table",
                  columns: [
                    { key: "name", label: arabic ? "القسم" : "Category" },
                    { key: "scope", label: arabic ? "الوصف" : "Scope" },
                    { key: "count", label: arabic ? "السجلات" : "Records", align: "end" },
                  ],
                  rows: cats.map((c) => ({
                    name: arabic ? c.nameAr : c.nameEn,
                    scope: c.description,
                    count: String(c.recordCount),
                  })),
                },
              ],
            },
            sources: [],
            meta: { ...metaBase, grounded: false },
          },
          sources: [],
          externalSources,
          intent: "catalog_overview",
          confidenceLevel: "strong",
          requiresClarification: false,
          warnings: [],
        })
      );
    }

    // 4. Company overview
    if (classified.intent === "company_info") {
      const clinics = knowledgeRetriever.getClinics();
      const summary = arabic
        ? `تقدم شركة Terra Solutions خدمات الكول سنتر ودعم العملاء لـ ${clinics.length} عيادات: ${clinics.map((c) => c.name).join("، ")}.`
        : `Terra Solutions provides Call Center, Chat Support, and BPO services supporting ${clinics.length} clinics: ${clinics.map((c) => c.name).join(", ")}.`;
      return withFallbackMeta(
        buildFinalAIResponse({
          rich: {
            schemaVersion: "1.0",
            language: lang,
            status: "success",
            answer: {
              summary,
              blocks: [
                { type: "heading", level: 2, text: arabic ? "نبذة عن Terra Solutions" : "About Terra Solutions", tone: "accent" },
                { type: "paragraph", text: summary, tone: "default" },
                {
                  type: "callout",
                  tone: "warning",
                  title: arabic ? "ملاحظة" : "Note",
                  text: arabic
                    ? "عناوين الفروع وأرقام الهواتف ومواعيد العمل غير متوفرة في ملفات الإكسل."
                    : "Street addresses, phone numbers, and working hours are absent from the supplied operational spreadsheets.",
                },
              ],
            },
            sources: [],
            meta: { ...metaBase, grounded: false },
          },
          sources: [],
          externalSources,
          intent: "company_info",
          confidenceLevel: "strong",
          requiresClarification: false,
          warnings: [],
        })
      );
    }

    // 5. Generic underspecified comparison clarification
    if (
      classified.asksComparison &&
      (/these two|two filler|بين نوعين|منتجين/.test(classified.normalized) ||
        results.length === 0)
    ) {
      const q = arabic
        ? "أي منتجين أو خدمتين تحديدًا ترغب في مقارنتهما؟"
        : "Which two specific products or services would you like to compare?";
      return withFallbackMeta(
        buildFinalAIResponse({
          rich: {
            schemaVersion: "1.0",
            language: lang,
            status: "clarification",
            answer: {
              summary: q,
              blocks: [
                { type: "heading", level: 2, text: arabic ? "مقارنة المنتجات" : "Product & Service Comparison", tone: "accent" },
                { type: "paragraph", text: q, tone: "info" },
                {
                  type: "list",
                  style: "bullet",
                  title: arabic ? "مقارنات موثقة جاهزة" : "Verified Comparisons Available",
                  items: [
                    "Botox vs. Fillers",
                    "Dr. CYJ Hair Filler vs. PRP vs. Stem Cells",
                    "Collagen Stimulators vs. Dermal Fillers",
                  ],
                },
              ],
            },
            sources: [],
            meta: { ...metaBase, grounded: false },
          },
          sources: [],
          externalSources,
          intent: "comparison",
          confidenceLevel: "ambiguous",
          requiresClarification: true,
          clarificationQuestion: q,
          warnings: [],
        })
      );
    }

    // 6. Strict honest abstention when unavailable, nonexistent clinic/device, or medical diagnosis
    if (confidence === "none" || results.length === 0) {
      const unavailableMsg = arabic
        ? UNAVAILABLE_KNOWLEDGE_MESSAGES.ar
        : UNAVAILABLE_KNOWLEDGE_MESSAGES.en;

      const blocks: RichResponseBlock[] = [
        {
          type: "callout",
          tone: "warning",
          title: arabic ? "المعلومة غير متوفرة" : "Information Not Available",
          text: unavailableMsg,
        },
      ];

      if (retrieval.missingIndicators.length > 0) {
        blocks.push({
          type: "list",
          style: "bullet",
          title: arabic ? "التفاصيل" : "Details",
          items: retrieval.missingIndicators,
          tone: "muted",
        });
      }

      appendExternalBlocks(blocks, request, arabic);

      const warnings =
        retrieval.missingIndicators.length > 0
          ? retrieval.missingIndicators
          : [unavailableMsg];

      return withFallbackMeta(
        buildFinalAIResponse({
          rich: {
            schemaVersion: "1.0",
            language: lang,
            status: "not_found",
            answer: { summary: unavailableMsg, blocks },
            sources: [],
            meta: { ...metaBase, grounded: false },
          },
          sources: [],
          externalSources,
          intent: classified.intent,
          confidenceLevel: "none",
          requiresClarification: false,
          warnings,
        })
      );
    }

    // 7. Specialized grounded handlers (only when results exist)
    if (classified.intent === "device_specs") {
      return withFallbackMeta(buildRichDevicesResponse(request, arabic, lang));
    }

    if (classified.intent === "price_offer_lookup") {
      return withFallbackMeta(buildRichPricingResponse(request, arabic, lang));
    }

    if (
      classified.intent === "clinic_lookup" &&
      !/tattoo|microblading|slimming|z-lipo|hifu|endolift|تاتو|تنحيف/i.test(
        classified.normalized
      )
    ) {
      return withFallbackMeta(buildRichClinicResponse(request, arabic, lang));
    }

    // 8. Ambiguity clarification across tied candidates
    if (
      retrieval.requiresClarification &&
      retrieval.clarificationCandidates.length >= 2
    ) {
      const candidates = retrieval.clarificationCandidates;
      const clarificationQuestion = arabic
        ? "وجدت أكثر من منتج أو خدمة مطابقة لبحثك. أي واحد تحديدًا تقصد؟"
        : "Multiple matching options were found in the knowledge base. Which specific one are you asking about?";
      const refs = toVerifiedRefs(candidates);

      return withFallbackMeta(
        buildFinalAIResponse({
          rich: {
            schemaVersion: "1.0",
            language: lang,
            status: "clarification",
            answer: {
              summary: clarificationQuestion,
              blocks: [
                { type: "badge", label: arabic ? "يحتاج توضيح" : "Clarification Needed", tone: "warning" },
                { type: "paragraph", text: clarificationQuestion, tone: "info" },
                {
                  type: "list",
                  style: "numbered",
                  items: candidates.map(
                    (c) =>
                      `${c.name} (${CATEGORIES[c.category]?.nameEn || c.category}) — ${c.source.sheet} R${c.source.row}`
                  ),
                },
                {
                  type: "source_list",
                  title: arabic ? "الخيارات المطابقة" : "Matching Sources",
                  items: refs,
                },
              ],
            },
            sources: refs,
            meta: { ...metaBase, grounded: refs.length > 0 },
          },
          sources: toMessageSources(candidates),
          externalSources,
          intent: classified.intent,
          confidenceLevel: "ambiguous",
          requiresClarification: true,
          clarificationQuestion,
          warnings: retrieval.missingIndicators,
        })
      );
    }

    // 9. Standard rich grounded response
    const topItems = results.slice(0, 4);
    const records = topItems.map((r) => r.record);
    const refs = toVerifiedRefs(records);
    const warnings: string[] = [...retrieval.missingIndicators];

    for (const cf of retrieval.conflicts) {
      warnings.push(cf.description);
    }

    const blocks: RichResponseBlock[] = [
      {
        type: "badge",
        label:
          confidence === "strong"
            ? arabic
              ? "تطابق مؤكد من قاعدة البيانات"
              : "Verified Match · Approved KB"
            : arabic
            ? "تطابق جزئي"
            : "Partial Match",
        tone: confidence === "strong" ? "success" : "warning",
      },
    ];

    for (const res of topItems) {
      const r = res.record;
      blocks.push({ type: "heading", level: 2, text: r.name, tone: "accent" });

      // Verified prices as highlighted metric tiles
      for (const p of r.prices) {
        blocks.push({
          type: "metric",
          label: arabic ? "السعر الموثق" : "Verified Price",
          value: p.note,
          tone: "success",
        });
      }

      // Structured attributes table when present
      const attrEntries = Object.entries(r.attributes);
      if (attrEntries.length > 0) {
        blocks.push({
          type: "table",
          columns: [
            { key: "field", label: arabic ? "البيان" : "Attribute" },
            { key: "value", label: arabic ? "القيمة الموثقة" : "Verified Value" },
          ],
          rows: attrEntries.map(([k, v]) => ({ field: k, value: v })),
        });
      }

      blocks.push({
        type: "paragraph",
        text: r.description,
        tone: "default",
      });

      if (r.conflictNotes && r.conflictNotes.length > 0) {
        blocks.push({
          type: "callout",
          tone: "danger",
          title: arabic ? "تنبيه تعارض في المصادر" : "Source Conflict Disclosed",
          text: r.conflictNotes.join(" "),
        });
      }
    }

    if (retrieval.missingIndicators.length > 0) {
      blocks.push({
        type: "callout",
        tone: "warning",
        title: arabic ? "معلومات غير متوفرة بالملف" : "Missing Information Notice",
        text: retrieval.missingIndicators.join(" "),
      });
    }

    if (retrieval.relatedRecords.length > 0) {
      blocks.push({
        type: "list",
        style: "bullet",
        title: arabic ? "سجلات ذات صلة" : "Related Records",
        items: retrieval.relatedRecords
          .slice(0, 3)
          .map((rel) => `${rel.name} (${rel.source.sheet} R${rel.source.row})`),
        tone: "info",
      });
    }

    blocks.push({
      type: "callout",
      tone: "info",
      title: arabic ? "إرشاد الأمان الطبي" : "Clinical Safety Guidance",
      text: arabic
        ? "لتقييم الحالة الفردية أو الموانع الطبية أو الحمل والرضاعة، يُرجى التحويل إلى الطبيب المختص بالعيادة."
        : "For individual medical suitability, diagnosis, or contraindications, direct the customer to a qualified clinic specialist.",
    });

    blocks.push({
      type: "source_list",
      title: arabic ? "المصادر المعتمدة" : "Verified Company Sources",
      items: refs,
    });

    appendExternalBlocks(blocks, request, arabic);

    const summary = arabic
      ? `تم استرجاع ${topItems.length} ${topItems.length === 1 ? "نتيجة موثقة" : "نتائج موثقة"} تخص: ${records[0].name}.`
      : `Retrieved ${topItems.length} verified knowledge base match${topItems.length > 1 ? "es" : ""} led by ${records[0].name}.`;

    const rich: RichAIResponse = {
      schemaVersion: "1.0",
      language: lang,
      status: confidence === "partial" ? "partial" : "success",
      answer: { summary, blocks },
      sources: refs,
      meta: { ...metaBase, grounded: refs.length > 0 },
    };

    return buildFinalAIResponse({
      rich,
      sources: toMessageSources(records),
      externalSources,
      intent: classified.intent,
      confidenceLevel: confidence,
      requiresClarification: false,
      warnings,
    });
  },

  async *streamResponse(
    request: AIRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const full = await this.generateResponse(request);
    const pieces = full.answer.split(/(\s+)/);
    let buf = "";
    for (let i = 0; i < pieces.length; i++) {
      if (request.signal?.aborted) break;
      buf += pieces[i];
      if (i % 10 === 0 || i === pieces.length - 1) {
        yield { type: "delta", text: buf };
        buf = "";
      }
    }
    yield { type: "complete", response: full };
  },
};

