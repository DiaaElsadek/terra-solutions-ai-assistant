/**
 * Deterministic Knowledge Retrieval Provider (Fallback / Development Mode).
 *
 * Uses the canonical retrieval pipeline (`knowledgeRetriever`) directly without an
 * external LLM. Explicitly sets `isMock: true` so the UI always displays
 * "Knowledge Search Mode (Deterministic)" rather than pretending an LLM generated it.
 */

import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { CATEGORIES } from "@/lib/knowledge/categories";
import { KNOWLEDGE_NOT_FOUND_RESPONSE, WELCOME_MESSAGE } from "@/constants/prompts";
import { toSafeErrorMessage } from "@/lib/security/api-guard";
import type { MessageSource } from "@/types";
import type {
  AIProvider,
  AIProviderConfig,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  ProviderValidationResult,
} from "./types";

const config: AIProviderConfig = {
  id: "mock",
  name: "Terra Knowledge Search (Deterministic Mode)",
  isMock: true,
  maxContextChars: 7500,
};

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

function appendExternalSection(
  base: string,
  request: AIRequest,
  arabic: boolean
): string {
  if (request.externalResults && request.externalResults.length > 0) {
    const rows = request.externalResults
      .map(
        (e) =>
          `- **[External] ${e.title}** (${e.source}) — ${e.snippet} ([Link](${e.url}))`
      )
      .join("\n");
    return (
      base +
      (arabic
        ? `\n\n### مصادر خارجية ثانوية (غير تابعة لسياسة تيرا الرسمية)\n${rows}`
        : `\n\n### External Web References (Secondary — Not Official Terra Policy)\n${rows}`)
    );
  }
  if (request.externalSearchNote) {
    return `${base}\n\n> **External Search:** ${request.externalSearchNote}`;
  }
  return base;
}

function buildDevicesResponse(request: AIRequest, arabic: boolean): AIResponse {
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

  const toSources = (
    list: typeof laserDevs
  ): MessageSource[] =>
    list.map((r) => ({
      category: CATEGORIES[r.category]?.nameEn || r.category,
      title: r.name,
      type: "knowledge",
      file: r.source.file,
      sheet: r.source.sheet,
      row: r.source.row,
      rows: r.source.rows,
    }));

  const formatList = (list: typeof laserDevs) =>
    list
      .map((r) => {
        const firstLine = r.description.split("\n")[0];
        return `- **${r.name}** — ${firstLine} *(Sheet: \`${r.source.sheet}\`, Row ${r.source.row})*`;
      })
      .join("\n");

  const body = arabic
    ? `## الأجهزة المتوفرة في العيادات ومواصفاتها

### 1. أجهزة إزالة الشعر بالليزر (${laserDevs.length})
${formatList(laserDevs)}

### 2. أجهزة البشرة والوجه (${facialDevs.length})
${formatList(facialDevs)}

### 3. أجهزة التنحيف ونحت الجسم (${slimDevs.length})
${formatList(slimDevs)}

### 4. أجهزة إزالة التاتو حسب العيادة (${tattooDevs.length})
${formatList(tattooDevs)}

> **ملاحظة:** اسألني عن أي جهاز بالاسم لعرض المواصفات التفصيلية والموانع.`
    : `## Available Clinic Devices & Specifications

### 1. Laser Hair Removal Devices (${laserDevs.length})
${formatList(laserDevs)}

### 2. Facial & Skin Rejuvenation Machines (${facialDevs.length})
${formatList(facialDevs)}

### 3. Slimming & Body Contouring Devices (${slimDevs.length})
${formatList(slimDevs)}

### 4. Tattoo Removal Devices by Clinic (${tattooDevs.length})
${formatList(tattooDevs)}

> **Agent Tip:** Ask about any specific device by name (e.g., *Candela*, *Vivace*, *Clear + Brilliant*, *HIFU*, *Endolift*) for complete protocols and contraindications.`;

  const answer = appendExternalSection(body, request, arabic);
  const sources = [
    ...toSources(laserDevs.slice(0, 2)),
    ...toSources(facialDevs.slice(0, 2)),
    ...toSources(slimDevs.slice(0, 2)),
    ...toSources(tattooDevs.slice(0, 2)),
  ];

  return {
    answer,
    content: answer,
    language: request.retrieval.classified.language,
    intent: "device_specs",
    confidenceLevel: "strong",
    requiresClarification: false,
    warnings: [],
    sources,
    externalSources: toExternalSources(request),
    provider: config.name,
    isMock: true,
  };
}

function buildPricingResponse(request: AIRequest, arabic: boolean): AIResponse {
  const pricedRecords = knowledgeRetriever
    .getAllRecords()
    .filter((r) => r.prices.length > 0);

  const sources: MessageSource[] = pricedRecords.map((r) => ({
    category: CATEGORIES[r.category]?.nameEn || r.category,
    title: r.name,
    type: "knowledge",
    file: r.source.file,
    sheet: r.source.sheet,
    row: r.source.row,
    rows: r.source.rows,
  }));

  const rowsMd = pricedRecords
    .map(
      (r) =>
        `| **${r.name}** | ${r.prices.map((p) => p.note).join("; ")} | \`${r.source.sheet}\` R${r.source.row} |`
    )
    .join("\n");

  const body = arabic
    ? `## الأسعار الموثّقة في قاعدة البيانات

| المنتج / الخدمة | السعر / السياسة السعرية | المصدر |
| --- | --- | --- |
${rowsMd}

> **تنبيه هام:** **العروض الترويجية الحالية وأسعار الباقات الكاملة** لباقي الخدمات (الفيلر، البوتوكس، الليزر، الفيشال، الأسنان، التنحيف) غير متوفرة في ملف البيانات المرفق. يرجى الرجوع إلى قائمة الأسعار المعتمدة بالعيادة.`
    : `## Verified Pricing & Offers Summary

| Service / Product | Verified Price / Rule | Source |
| --- | --- | --- |
${rowsMd}

> **Unavailable Information Notice:** Current promotional **offers, package prices, and full price lists** for other treatments (Fillers, Botox, Laser sessions, Facials, Dental Veneers, Slimming) are **not included** in the supplied Excel knowledge base. Verify exact pricing with clinic reception or your supervisor.`;

  const answer = appendExternalSection(body, request, arabic);
  return {
    answer,
    content: answer,
    language: request.retrieval.classified.language,
    intent: "price_offer_lookup",
    confidenceLevel: "partial",
    requiresClarification: false,
    warnings: [
      "Promotional offers and package price lists are unavailable in the supplied workbook.",
    ],
    sources,
    externalSources: toExternalSources(request),
    provider: config.name,
    isMock: true,
  };
}

function buildClinicResponse(request: AIRequest, arabic: boolean): AIResponse {
  const clinics = knowledgeRetriever.getClinics();
  const hints = request.retrieval.classified.clinicHints;
  const targetClinics =
    hints.length > 0 ? clinics.filter((c) => hints.includes(c.id)) : clinics;

  const sources: MessageSource[] = targetClinics.map((c) => ({
    category: "Clinics",
    title: c.name,
    type: "knowledge",
    file: "clinics.json + Knowlege.xlsx",
    sheet: "clinics",
    row: 0,
    rows: [0],
  }));

  const blocks = targetClinics
    .map((c) => {
      const devList = c.devices
        .map(
          (d) =>
            `- **${d.device}** — ${d.service}` +
            (d.technology ? ` (${d.technology})` : "") +
            (d.note ? ` · *${d.note}*` : "")
        )
        .join("\n");
      const notesStr = c.notes.length > 0 ? `\n- **Notes:** ${c.notes.join(" ")}` : "";
      return `### ${c.name}\n- **Verified Services:** ${c.services.join(", ")}\n${devList}${notesStr}`;
    })
    .join("\n\n");

  const body = arabic
    ? `## معلومات العيادات الموثّقة\n\n${blocks}\n\n> **بيانات غير متوفرة:** **عناوين العيادات، أرقام الهواتف، وساعات العمل** غير متوفرة في الملفات المرفقة.`
    : `## Verified Clinic Profiles\n\n${blocks}\n\n> **Unavailable Details:** Clinic street **addresses, phone numbers, and operating hours** are not included in the supplied source files.`;

  const answer = appendExternalSection(body, request, arabic);
  return {
    answer,
    content: answer,
    language: request.retrieval.classified.language,
    intent: "clinic_lookup",
    confidenceLevel: "strong",
    requiresClarification: false,
    warnings: [
      "Clinic addresses, phone numbers, and working hours are not present in the source files.",
    ],
    sources,
    externalSources: toExternalSources(request),
    provider: config.name,
    isMock: true,
  };
}

export const mockProvider: AIProvider = {
  config,

  validateConfiguration(): ProviderValidationResult {
    return { configured: true, providerId: "mock" };
  },

  normalizeError(err: unknown): string {
    return toSafeErrorMessage(err);
  },

  async generateResponse(request: AIRequest): Promise<AIResponse> {
    const retrieval = request.retrieval;
    const { classified, results, confidence } = retrieval;
    const arabic = classified.language === "ar";
    const externalSources = toExternalSources(request);

    if (classified.intent === "greeting") {
      return {
        answer: WELCOME_MESSAGE,
        content: WELCOME_MESSAGE,
        language: classified.language,
        intent: "greeting",
        confidenceLevel: "strong",
        requiresClarification: false,
        warnings: [],
        sources: [],
        externalSources,
        provider: config.name,
        isMock: true,
      };
    }

    if (classified.intent === "call_script") {
      const answer = arabic
        ? `## مساعد نصوص مكالمات الكول سنتر\n\nأي خدمة أو منتج يسأل عنه العميل تحديدًا؟ اكتب اسم الخدمة وسأعرض لك الملخص والموانع والتعليمات.\n\n**أمثلة:**\n- *ماذا أقول لعميل يسأل عن إزالة الشعر بالليزر؟*\n- *ماذا أقول لعميل يسأل عن البوتوكس أو الفيلر؟*\n- *ما هي العلاجات الآمنة أثناء الحمل؟*`
        : `## Customer Call Script Helper\n\nWhich specific service or treatment is the customer asking about?\n\n**Examples you can ask:**\n- *"What should I tell a customer asking about laser hair removal?"*\n- *"What should I tell a customer asking about Dermal Fillers or Botox?"*\n- *"What treatments are safe during pregnancy or lactation?"*`;

      return {
        answer,
        content: answer,
        language: classified.language,
        intent: "call_script",
        confidenceLevel: "ambiguous",
        requiresClarification: true,
        clarificationQuestion: "Which specific service is the customer asking about?",
        warnings: [],
        sources: [],
        externalSources,
        provider: config.name,
        isMock: true,
      };
    }

    if (classified.intent === "catalog_overview") {
      const cats = knowledgeRetriever
        .getCategoriesWithCounts()
        .filter((c) => c.recordCount > 0 && c.id !== "clinics");
      const rows = cats
        .map(
          (c) =>
            `| **${c.nameEn}** | ${c.nameAr} | ${c.description} | ${c.recordCount} |`
        )
        .join("\n");

      const answer = `## Terra Solutions Products & Services\n\n| Category | القسم | Scope | Canonical Records |\n| --- | --- | --- | --- |\n${rows}\n\nAsk about any specific product, device, clinic, or safety question for row-level details.`;
      return {
        answer,
        content: answer,
        language: classified.language,
        intent: "catalog_overview",
        confidenceLevel: "strong",
        requiresClarification: false,
        warnings: [],
        sources: [],
        externalSources,
        provider: config.name,
        isMock: true,
      };
    }

    if (classified.intent === "company_info") {
      const clinics = knowledgeRetriever.getClinics();
      const answer = `## About Terra Solutions\n\nTerra Solutions provides Call Center, Chat Support, and BPO services in Egypt, supporting clinical operations across **${clinics.length} partner clinics**: ${clinics.map((c) => `**${c.name}**`).join(", ")}.\n\n> **Note:** Street addresses, phone numbers, and working hours are not provided in the supplied operational spreadsheets.`;
      return {
        answer,
        content: answer,
        language: classified.language,
        intent: "company_info",
        confidenceLevel: "strong",
        requiresClarification: false,
        warnings: [],
        sources: [],
        externalSources,
        provider: config.name,
        isMock: true,
      };
    }

    // Ambiguous generic comparison ("Compare these two products")
    if (
      classified.asksComparison &&
      (/these two|two filler|بين نوعين|منتجين/.test(classified.normalized) ||
        results.length === 0)
    ) {
      const answer = arabic
        ? `## مقارنة المنتجات أو العلاجات\n\nأي منتجين أو خدمتين تحديدًا ترغب بمقارنتهما؟\n\n**أمثلة جاهزة في قاعدة البيانات:**\n- *قارن بين البوتوكس والفيلر*\n- *قارن بين Dr. CYJ و PRP للشعر*\n- *قارن بين حقن الكولاجين والفيلر*`
        : `## Product & Service Comparison\n\nWhich two products or services would you like to compare?\n\n**Verified comparisons available:**\n- *Compare Botox vs. Fillers*\n- *Compare Dr. CYJ Hair Filler vs. PRP vs. Stem Cells*\n- *Compare Collagen Stimulators vs. Fillers*\n- *Compare Juvederm Voluma vs. Radiesse*`;

      return {
        answer,
        content: answer,
        language: classified.language,
        intent: "comparison",
        confidenceLevel: "ambiguous",
        requiresClarification: true,
        clarificationQuestion: "Which two specific products or services should be compared?",
        warnings: [],
        sources: [],
        externalSources,
        provider: config.name,
        isMock: true,
      };
    }

    // No reliable match / explicit abstention (unknown clinic, medical diagnosis, out-of-domain device)
    if (confidence === "none" || results.length === 0) {
      const baseAbstain =
        retrieval.missingIndicators.length > 0
          ? `${KNOWLEDGE_NOT_FOUND_RESPONSE}\n\n> **Reason:** ${retrieval.missingIndicators.join(" ")}`
          : KNOWLEDGE_NOT_FOUND_RESPONSE;
      const answer = appendExternalSection(baseAbstain, request, arabic);
      return {
        answer,
        content: answer,
        language: classified.language,
        intent: classified.intent,
        confidenceLevel: "none",
        requiresClarification: false,
        warnings:
          retrieval.missingIndicators.length > 0
            ? retrieval.missingIndicators
            : ["No reliable match found in the canonical Terra Solutions dataset."],
        sources: [],
        externalSources,
        provider: config.name,
        isMock: true,
      };
    }

    if (classified.intent === "device_specs") {
      return buildDevicesResponse(request, arabic);
    }

    if (classified.intent === "price_offer_lookup") {
      return buildPricingResponse(request, arabic);
    }

    if (
      classified.intent === "clinic_lookup" &&
      !/tattoo|microblading|slimming|z-lipo|hifu|endolift|تاتو|تنحيف/i.test(
        classified.normalized
      )
    ) {
      return buildClinicResponse(request, arabic);
    }

    // Ambiguous match across multiple products -> Ask clarification while showing options
    if (
      retrieval.requiresClarification &&
      retrieval.clarificationCandidates.length >= 2
    ) {
      const candidates = retrieval.clarificationCandidates;
      const list = candidates
        .map(
          (c) =>
            `- **${c.name}** (${CATEGORIES[c.category]?.nameEn || c.category}) — ${c.description.split("\n")[0]} *(Source: \`${c.source.sheet}\` R${c.source.row})*`
        )
        .join("\n");

      const clarificationQuestion = arabic
        ? `وجدت أكثر من منتج/خدمة مطابقة لبحثك. أي واحد تحديدًا تقصد؟`
        : `Multiple matching options were found. Which specific one are you asking about?`;

      const answer = `## Clarification Needed\n\n${clarificationQuestion}\n\n${list}`;
      const sources: MessageSource[] = candidates.map((c) => ({
        category: CATEGORIES[c.category]?.nameEn || c.category,
        title: c.name,
        type: "knowledge",
        file: c.source.file,
        sheet: c.source.sheet,
        row: c.source.row,
        rows: c.source.rows,
      }));

      return {
        answer,
        content: answer,
        language: classified.language,
        intent: classified.intent,
        confidenceLevel: "ambiguous",
        requiresClarification: true,
        clarificationQuestion,
        warnings: retrieval.missingIndicators,
        sources,
        externalSources,
        provider: config.name,
        isMock: true,
      };
    }

    // Standard grounded response
    const topItems = results.slice(0, 4);
    const sources: MessageSource[] = topItems.map((res) => ({
      category: CATEGORIES[res.record.category]?.nameEn || res.record.category,
      title: res.record.name,
      type: "knowledge",
      file: res.record.source.file,
      sheet: res.record.source.sheet,
      row: res.record.source.row,
      rows: res.record.source.rows,
      confidenceScore: res.score,
      matchReasons: res.matchReasons,
    }));

    const sections = topItems.map((res) => {
      const r = res.record;
      const catLabel = CATEGORIES[r.category]?.nameEn || r.category;
      const priceNote =
        r.prices.length > 0
          ? `\n\n**Verified Price:** ${r.prices.map((p) => p.note).join(" | ")}`
          : "";
      const conflictNote =
        r.conflictNotes && r.conflictNotes.length > 0
          ? `\n\n> **Source Conflict Notice:** ${r.conflictNotes.join(" ")}`
          : "";
      return (
        `### ${r.name}\n` +
        `**Category:** ${catLabel} · **Source:** \`${r.source.file}\` → \`${r.source.sheet}\` (Row${r.source.rows.length > 1 ? "s" : ""} ${r.source.rows.join(", ")})\n\n` +
        `${r.description}${priceNote}${conflictNote}`
      );
    });

    const warnings: string[] = [...retrieval.missingIndicators];
    for (const cf of retrieval.conflicts) {
      warnings.push(cf.description);
    }

    const relatedBlock =
      retrieval.relatedRecords.length > 0
        ? "\n\n**Related Records:** " +
          retrieval.relatedRecords
            .slice(0, 3)
            .map((rel) => `*${rel.name}* (\`${rel.source.sheet}\` R${rel.source.row})`)
            .join(" · ")
        : "";

    const missingBlock =
      retrieval.missingIndicators.length > 0
        ? `\n\n> **Unavailable Information Notice:** ${retrieval.missingIndicators.join(" ")}`
        : "";

    const safetyNote = arabic
      ? `\n\n> **توجيه طبي:** للتحقق من ملاءمة الإجراء لحالة العميل الطبية أو الموانع الفردية، يُرجى التحويل إلى الطبيب المختص بالعيادة.`
      : `\n\n> **Specialist Guidance:** For patient-specific medical suitability, diagnosis, or contraindications, direct the customer to a qualified clinic specialist.`;

    const header = arabic
      ? `تم استرجاع **${topItems.length}** ${topItems.length === 1 ? "نتيجة موثّقة" : "نتائج موثّقة"} من قاعدة بيانات الشركة:`
      : `Found **${topItems.length}** verified match${topItems.length > 1 ? "es" : ""} in Terra Solutions' canonical knowledge base:`;

    const rawBody =
      `${header}\n\n${sections.join("\n\n---\n\n")}${relatedBlock}${missingBlock}${safetyNote}`;
    const answer = appendExternalSection(rawBody, request, arabic);

    return {
      answer,
      content: answer,
      language: classified.language,
      intent: classified.intent,
      confidenceLevel: confidence,
      requiresClarification: false,
      warnings,
      sources,
      externalSources,
      provider: config.name,
      isMock: true,
    };
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
