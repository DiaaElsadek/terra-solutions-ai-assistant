import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveContextualQuery } from "@/lib/knowledge/context-query";
import { KnowledgeIngestionPipeline } from "@/lib/knowledge/ingestion/pipeline";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { geminiProvider, resolveGeminiKey } from "@/lib/ai/gemini-provider";
import { localFallbackProvider } from "@/lib/ai/providers/local-fallback-provider";
import {
  validateModelRichResponse,
  type RichAIResponse,
} from "@/lib/ai/response-schema";
import { UNAVAILABLE_KNOWLEDGE_MESSAGES } from "@/lib/ai/prompts/terra-system-prompt";
import { resetRateLimits } from "@/lib/security/api-guard";
import { POST as chatPost } from "@/app/api/chat/route";
import { AIResponseRenderer } from "@/components/chat/AIResponseRenderer";

describe("Conversation Follow-Up Context & Extensible Ingestion Pipeline", () => {
  it("resolves Arabic and English follow-up questions using recent context anchors", () => {
    const arCtx = resolveContextualQuery("طب قارنلي بين أول جهازين", [
      { role: "user", content: "إيه أجهزة الليزر المتوفرة في العيادات؟" },
      { role: "assistant", content: "الأجهزة تشمل Candela GentleMax Pro Plus و Cynosure Elite Plus." },
    ]);
    assert.equal(arCtx.usedContext, true);
    assert.ok(arCtx.extractedAnchors.some((a) => /Candela|Cynosure/i.test(a)));

    const retrieved = knowledgeRetriever.retrieve(arCtx.effectiveQuery);
    assert.ok(retrieved.results.length >= 2);
    assert.ok(
      retrieved.results.some((r) => r.record.category === "laser"),
      "Follow-up query should retrieve laser devices"
    );

    const enCtx = resolveContextualQuery("What about its price?", [
      { role: "user", content: "Tell me about Aptos Cat Eye threads" },
    ]);
    assert.equal(enCtx.usedContext, true);
    const enRet = knowledgeRetriever.retrieve(enCtx.effectiveQuery);
    assert.equal(enRet.results[0]?.record.id, "thread-aptos-cat-eye-threads");
  });

  it("ingests CSV, JSON, and TXT sources with manifest tracking, conflict detection, and deactivation", () => {
    const pipeline = new KnowledgeIngestionPipeline();

    const csvOut = pipeline.ingestSource({
      fileName: "new-promo.csv",
      fileType: "csv",
      version: 1,
      defaultCategory: "facial",
      rawContent: "name,description,clinic\nAqua Gold Facial,Brightening glow session,Dermadent",
    });
    assert.equal(csvOut.addedRecords.length, 1);
    assert.equal(pipeline.getActiveRecords().length, 1);

    const conflictCsv = pipeline.ingestSource({
      fileName: "updated-promo.csv",
      fileType: "csv",
      version: 2,
      defaultCategory: "facial",
      rawContent: "name,description,clinic\nAqua Gold Facial,Updated protocol 2 sessions,Well Touch",
    });
    assert.equal(conflictCsv.duplicateIds.length, 1);
    assert.equal(conflictCsv.conflicts.length, 1);

    const txtOut = pipeline.ingestSource({
      fileName: "notes.txt",
      fileType: "txt",
      rawContent: "Aftercare Policy\nAvoid direct sun exposure for 48 hours post-treatment.",
    });
    assert.equal(txtOut.addedRecords.length, 1);

    const deactivated = pipeline.deactivateSource(csvOut.manifest.sourceId);
    assert.equal(deactivated, true);
    assert.equal(
      pipeline.getActiveRecords().some((r) => r.source.sourceId === csvOut.manifest.sourceId),
      false
    );

    assert.throws(() =>
      pipeline.ingestSource({
        fileName: "manual.pdf",
        fileType: "pdf",
        rawContent: "binary",
      })
    );
  });
});

describe("Gemini Grounding, Source Verification, Error Resilience & Fallback", () => {
  const originalFetch = globalThis.fetch;
  const envKeys = ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY", "OPENAI_API_KEY", "API_KEY", "AI_PROVIDER"];
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    resetRateLimits();
    for (const k of envKeys) savedEnv[k] = process.env[k];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const k of envKeys) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it("supports API_KEY from .env for Gemini without leaking keys and respects OpenAI sk- exclusion", () => {
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.AI_PROVIDER;
    process.env.API_KEY = "non-aiza-custom-server-key-12345";
    assert.equal(resolveGeminiKey(), "non-aiza-custom-server-key-12345");
    assert.equal(geminiProvider.validateConfiguration().configured, true);

    process.env.API_KEY = "sk-proj-openai-only-123456";
    assert.equal(resolveGeminiKey(), null);
  });

  it("strips hallucinated source IDs and arbitrary HTML during server-side response validation", () => {
    const retrieval = knowledgeRetriever.retrieve("Aptos Cat Eye price");
    const realId = retrieval.results[0].record.id;
    const rawModelJson = JSON.stringify({
      schemaVersion: "1.0",
      language: "en",
      status: "success",
      answer: {
        summary: "<red>Aptos Cat Eye</red> costs 5000 AED.",
        blocks: [
          { type: "paragraph", text: "<script>alert(1)</script>Confirmed 5000 AED.", tone: "success" },
          { type: "unknown_widget", text: "Should be dropped" },
          {
            type: "table",
            columns: [{ key: "service", label: "Service" }, { key: "price", label: "Price", align: "end" }],
            rows: [{ service: "Aptos Cat Eye", price: "5000 AED" }],
          },
        ],
      },
      sources: [
        { recordId: realId, fileName: "Knowlege.xlsx", sheetName: "Filler+Botox+Threads", rowNumber: 1 },
        { recordId: "hallucinated-fake-id", fileName: "Fake.xlsx", sheetName: "Fake", rowNumber: 999 },
      ],
      meta: { provider: "gemini", model: "gemini-2.5-flash", grounded: true },
    });

    const out = validateModelRichResponse(rawModelJson, {
      retrievedRecords: retrieval.results.map((r) => r.record),
      confidence: retrieval.confidence,
      fallbackLanguage: "en",
      provider: "gemini",
      model: "gemini-2.5-flash",
    });

    assert.equal(out.ok, true);
    assert.ok(out.response);
    assert.equal(out.response.answer.summary.includes("<red>"), false);
    assert.equal(out.response.answer.blocks.length, 2);
    assert.equal(out.response.sources.length, 1);
    assert.equal(out.response.sources[0].recordId, realId);
    assert.equal(out.response.sources.some((s) => s.recordId === "hallucinated-fake-id"), false);
  });

  it("performs one corrective retry on invalid JSON and succeeds when retry fixes schema", async () => {
    process.env.GEMINI_API_KEY = "AIzaTestCorrectiveRetry123456";
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      if (calls === 1) {
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "{bad json" }] } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      schemaVersion: "1.0",
                      language: "en",
                      status: "success",
                      answer: {
                        summary: "Aptos Cat Eye is 5000 AED.",
                        blocks: [{ type: "metric", label: "Price", value: "5000 AED", tone: "success" }],
                      },
                      sources: [],
                      meta: { provider: "gemini", model: "gemini-2.5-flash", grounded: true },
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const retrieval = knowledgeRetriever.retrieve("Aptos Cat Eye price");
    const resp = await geminiProvider.generateResponse({
      userMessage: "Aptos Cat Eye price",
      conversationHistory: [],
      systemPrompt: "sys",
      contextPackage: "ctx",
      retrieval,
    });
    assert.equal(calls, 2);
    assert.equal(resp.structured?.meta.provider, "gemini");
    assert.equal(resp.structured?.answer.blocks[0].type, "metric");
  });

  it("falls back automatically to local_fallback on Gemini 429 rate limit, timeout, and missing key", async () => {
    // Case A: Gemini HTTP 429 rate limit -> backoff retry (2 calls) -> graceful /api/chat fallback
    process.env.GEMINI_API_KEY = "AIzaTestRateLimitKey123456";
    let rateCalls = 0;
    globalThis.fetch = (async () => {
      rateCalls++;
      return new Response("Too many requests", { status: 429 });
    }) as typeof fetch;

    const req429 = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.1.1" },
      body: JSON.stringify({ message: "Juvederm Voluma", preferredProvider: "gemini" }),
    });
    const res429 = await chatPost(req429);
    assert.equal(res429.status, 200);
    const body429 = (await res429.json()) as {
      isMock: boolean;
      errorCategory?: string;
      structured: RichAIResponse;
    };
    assert.equal(rateCalls, 2);
    assert.equal(body429.isMock, true);
    assert.equal(body429.errorCategory, "GEMINI_RATE_LIMIT");
    assert.equal(body429.structured.meta.provider, "local_fallback");
    assert.equal(body429.structured.meta.grounded, true);

    // Case B: Gemini timeout -> graceful fallback
    globalThis.fetch = (async () => {
      throw new DOMException("The operation was aborted", "AbortError");
    }) as typeof fetch;
    const reqTimeout = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.1.2" },
      body: JSON.stringify({ message: "Botox pregnancy safety", preferredProvider: "gemini" }),
    });
    const resTimeout = await chatPost(reqTimeout);
    assert.equal(resTimeout.status, 200);
    const bodyTimeout = (await resTimeout.json()) as { errorCategory?: string; structured: RichAIResponse };
    assert.equal(bodyTimeout.errorCategory, "GEMINI_TIMEOUT");
    assert.equal(bodyTimeout.structured.meta.provider, "local_fallback");

    // Case C: Missing API Key -> localFallbackProvider without crash
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.API_KEY;
    const reqNoKey = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.1.1.3" },
      body: JSON.stringify({ message: "ما هو سعر تذاكر الطيران إلى باريس؟", preferredProvider: "auto" }),
    });
    const resNoKey = await chatPost(reqNoKey);
    assert.equal(resNoKey.status, 200);
    const bodyNoKey = (await resNoKey.json()) as { structured: RichAIResponse };
    assert.equal(bodyNoKey.structured.meta.provider, "local_fallback");
    assert.equal(bodyNoKey.structured.status, "not_found");
    assert.equal(bodyNoKey.structured.answer.summary, UNAVAILABLE_KNOWLEDGE_MESSAGES.ar);
  });

  it("emits exact English missing message and exposes source conflicts in localFallbackProvider", async () => {
    const notFoundRet = knowledgeRetriever.retrieve("What laser devices are available at Cairo Star Clinic?");
    const notFoundResp = await localFallbackProvider.generateResponse({
      userMessage: "What laser devices are available at Cairo Star Clinic?",
      conversationHistory: [],
      systemPrompt: "sys",
      contextPackage: "",
      retrieval: notFoundRet,
    });
    assert.equal(notFoundResp.structured?.status, "not_found");
    assert.equal(notFoundResp.structured?.answer.summary, UNAVAILABLE_KNOWLEDGE_MESSAGES.en);
    assert.equal(notFoundResp.structured?.meta.grounded, false);

    const botoxRet = knowledgeRetriever.retrieve("Allergan Botox 100 unit");
    const botoxResp = await localFallbackProvider.generateResponse({
      userMessage: "Allergan Botox 100 unit",
      conversationHistory: [],
      systemPrompt: "sys",
      contextPackage: "",
      retrieval: botoxRet,
    });
    assert.equal(botoxResp.structured?.meta.provider, "local_fallback");
    assert.ok((botoxResp.structured?.sources.length ?? 0) >= 1);
  });
});

describe("AIResponseRenderer Safe UI & RTL/LTR Presentation", () => {
  it("renders all 10 semantic block types cleanly with RTL Arabic and strips untrusted HTML", () => {
    const richAr: RichAIResponse = {
      schemaVersion: "1.0",
      language: "ar",
      status: "success",
      answer: {
        summary: "سعر خيوط Aptos Cat Eye المسجل",
        blocks: [
          { type: "badge", label: "معلومة مؤكدة", tone: "success" },
          { type: "heading", level: 2, text: "تفاصيل الأسعار", tone: "accent" },
          { type: "paragraph", text: "<script>bad()</script>السعر مسجل كما ورد بالملف.", tone: "info" },
          { type: "list", style: "bullet", title: "ملاحظات", items: ["العيادة المعتمدة", "الالتزام بالتعليمات"] },
          {
            type: "table",
            title: "جدول مقارنة",
            columns: [
              { key: "service", label: "الخدمة" },
              { key: "price", label: "السعر", align: "end" },
            ],
            rows: [{ service: "Aptos Cat Eye", price: "5000 AED" }, { service: "Other", price: "" }],
          },
          { type: "metric", label: "السعر الموثق", value: "5000 AED", tone: "success", calculationNote: "قيمة مباشرة" },
          { type: "callout", tone: "warning", title: "تنبيه", text: "تأكد من المختص" },
          { type: "quote", text: "نص إرشادي من الملف", citation: "Filler+Botox+Threads R1" },
          { type: "divider" },
          {
            type: "source_list",
            items: [{ recordId: "r1", fileName: "Knowlege.xlsx", sheetName: "Filler+Botox+Threads", rowNumber: 1 }],
          },
        ],
      },
      sources: [{ recordId: "r1", fileName: "Knowlege.xlsx", sheetName: "Filler+Botox+Threads", rowNumber: 1 }],
      meta: { provider: "gemini", model: "gemini-2.5-flash", grounded: true },
    };

    const html = renderToStaticMarkup(React.createElement(AIResponseRenderer, { response: richAr }));
    assert.ok(html.includes('dir="rtl"'));
    assert.ok(html.includes("5000 AED"));
    assert.ok(html.includes("Knowlege.xlsx"));
    assert.ok(html.includes("—"), "Empty cell should display clean placeholder dash");
    assert.equal(html.includes("<script>"), false, "Must strip script tags cleanly");
    assert.ok(html.includes("bg-emerald-500/10"));
    assert.ok(html.includes("bg-amber-500/10"));
  });
});

