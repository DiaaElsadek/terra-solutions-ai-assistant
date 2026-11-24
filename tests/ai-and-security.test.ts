import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { buildContextPackage } from "@/lib/ai/prompt-builder";
import { validateAndNormalizeStructuredOutput } from "@/lib/ai/response-validator";
import { openaiProvider } from "@/lib/ai/openai-provider";
import { geminiProvider } from "@/lib/ai/gemini-provider";
import { redactCustomerPII } from "@/lib/security/privacy";
import {
  checkRateLimit,
  resetRateLimits,
  validateChatRequestPayload,
  toSafeErrorMessage,
} from "@/lib/security/api-guard";
import { googleSearchProvider } from "@/lib/search/google-search";
import { GET as chatGet, POST as chatPost } from "@/app/api/chat/route";
import { GET as knowledgeGet } from "@/app/api/knowledge/route";

describe("AI Grounding, Context Budgets & Structured Response Validation", () => {
  it("builds a bounded context package with source provenance", () => {
    const retrieval = knowledgeRetriever.retrieve("Aptos Cat Eye threads price");
    const pkg = buildContextPackage(retrieval, { maxChars: 2200 });
    assert.ok(pkg.sources.length >= 1);
    assert.ok(pkg.sources[0].file);
    assert.ok(pkg.sources[0].sheet);
    assert.ok((pkg.sources[0].rows?.length ?? 0) > 0);
    assert.ok(pkg.contextPackage.includes("Knowlege.xlsx"));
    assert.ok(pkg.contextPackage.length <= 4500);
  });

  it("parses valid fenced JSON and safely wraps malformed LLM text without throwing", () => {
    const valid = validateAndNormalizeStructuredOutput(
      '```json\n{"answer":"Grounded result","language":"en","intent":"product_service_lookup","confidenceLevel":"strong","requiresClarification":false,"warnings":["Verify offer dates"]}\n```',
      {
        language: "en",
        intent: "product_service_lookup",
        confidenceLevel: "partial",
        requiresClarification: false,
        warnings: [],
      }
    );
    assert.equal(valid.answer, "Grounded result");
    assert.equal(valid.confidenceLevel, "strong");
    assert.deepEqual(valid.warnings, ["Verify offer dates"]);

    const malformed = validateAndNormalizeStructuredOutput("Plain markdown fallback response", {
      language: "ar",
      intent: "comparison",
      confidenceLevel: "partial",
      requiresClarification: false,
      warnings: ["Check source"],
    });
    assert.equal(malformed.answer, "Plain markdown fallback response");
    assert.equal(malformed.language, "ar");
    assert.deepEqual(malformed.warnings, ["Check source"]);
  });
});

describe("Security, Privacy, Rate Limiting & Data Isolation", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("redacts customer phone numbers, emails, and national IDs while keeping price units intact", () => {
    const input =
      "Call customer at +971 50 123 4567 or email patient@example.com ID 29801011234567 about Aptos 5000 AED";
    const result = redactCustomerPII(input);
    assert.equal(result.sanitized.includes("50 123 4567"), false);
    assert.equal(result.sanitized.includes("patient@example.com"), false);
    assert.equal(result.sanitized.includes("29801011234567"), false);
    assert.equal(result.sanitized.includes("5000 AED"), true);
    assert.deepEqual(result.redactedTypes.sort(), ["email", "national_id", "phone"]);
  });

  it("validates chat request payloads and rejects invalid, empty, or oversized requests", () => {
    assert.equal(validateChatRequestPayload("{").ok, false);
    assert.equal(validateChatRequestPayload(JSON.stringify({ message: "   " })).ok, false);
    assert.equal(
      validateChatRequestPayload(JSON.stringify({ message: "a".repeat(2500) })).ok,
      false
    );
    const oversized = JSON.stringify({ message: "hi", extra: "x".repeat(35000) });
    const res413 = validateChatRequestPayload(oversized);
    assert.equal(res413.ok, false);
    if (!res413.ok) assert.equal(res413.status, 413);

    const valid = validateChatRequestPayload(
      JSON.stringify({
        message: "  Juvederm Voluma\u0007 ",
        history: [{ role: "user", content: "hi" }],
        preferredProvider: "mock",
        stream: true,
      })
    );
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.data.message, "Juvederm Voluma");
      assert.equal(valid.data.preferredProvider, "mock");
      assert.equal(valid.data.stream, true);
    }
  });

  it("enforces sliding-window rate limits and redacts API keys from error messages", () => {
    for (let i = 0; i < 3; i++) {
      assert.equal(checkRateLimit("10.0.0.1", 3, 60_000).allowed, true);
    }
    assert.equal(checkRateLimit("10.0.0.1", 3, 60_000).allowed, false);

    const safe = toSafeErrorMessage(
      new Error("Failed with Bearer sk-proj-secretkey1234567890 and AIzaSyDummyKeyValue123456789")
    );
    assert.equal(safe.includes("sk-proj-secretkey"), false);
    assert.equal(safe.includes("AIzaSyDummyKeyValue"), false);
    assert.equal(safe.includes("[REDACTED"), true);
  });

  it("keeps public/ completely free of raw Excel and JSON knowledge datasets", () => {
    const publicDir = path.join(process.cwd(), "public");
    if (!fs.existsSync(publicDir)) return;
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(full);
      }
    };
    walk(publicDir);
    assert.equal(
      files.some((f) => /\.(xlsx|xls|csv|json)$/i.test(f)),
      false,
      `Found unexpected dataset files in public/: ${files.join(", ")}`
    );
  });

  it("handles unconfigured Google Search explicitly without fake results", async () => {
    const prevKey = process.env.GOOGLE_SEARCH_API_KEY;
    const prevCx = process.env.GOOGLE_SEARCH_ENGINE_ID;
    delete process.env.GOOGLE_SEARCH_API_KEY;
    delete process.env.GOOGLE_SEARCH_ENGINE_ID;
    try {
      assert.equal(googleSearchProvider.isAvailable(), false);
      const out = await googleSearchProvider.search("Candela GentleMax");
      assert.equal(out.available, false);
      assert.deepEqual(out.results, []);
    } finally {
      if (prevKey !== undefined) process.env.GOOGLE_SEARCH_API_KEY = prevKey;
      if (prevCx !== undefined) process.env.GOOGLE_SEARCH_ENGINE_ID = prevCx;
    }
  });
});

describe("API Route Handlers & Mocked External LLM Providers", () => {
  const originalFetch = globalThis.fetch;
  const envSnapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    resetRateLimits();
    for (const key of ["OPENAI_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_API_KEY", "API_KEY", "AI_PROVIDER"]) {
      envSnapshot[key] = process.env[key];
    }
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const [k, v] of Object.entries(envSnapshot)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("handles OpenAI and Gemini provider HTTP calls with PII redaction and structured output", async () => {
    let seenOpenAIBody = "";
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      seenOpenAIBody = String(init?.body || "");
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  answer: "Mocked OpenAI answer for Aptos",
                  language: "en",
                  intent: "price_offer_lookup",
                  confidenceLevel: "strong",
                  requiresClarification: false,
                  warnings: [],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    process.env.OPENAI_API_KEY = "sk-test-1234567890abcdef";
    const retrieval = knowledgeRetriever.retrieve("Aptos Cat Eye threads");
    const openAiResp = await openaiProvider.generateResponse({
      userMessage: "Price for client +971 50 999 8888",
      conversationHistory: [],
      systemPrompt: "sys",
      contextPackage: "ctx",
      retrieval,
    });
    assert.equal(openAiResp.content, "Mocked OpenAI answer for Aptos");
    assert.equal(seenOpenAIBody.includes("999 8888"), false);

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      answer: "Mocked Gemini answer",
                      language: "en",
                      intent: "product_service_lookup",
                      confidenceLevel: "strong",
                      requiresClarification: false,
                      warnings: [],
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

    process.env.GEMINI_API_KEY = "AIzaSyTestKey1234567890123456";
    const geminiResp = await geminiProvider.generateResponse({
      userMessage: "Juvederm Voluma",
      conversationHistory: [],
      systemPrompt: "sys",
      contextPackage: "ctx",
      retrieval,
    });
    assert.equal(geminiResp.content, "Mocked Gemini answer");
  });

  it("handles GET /api/chat, POST /api/chat (NDJSON streaming & rate limits), and GET /api/knowledge", async () => {
    const statusRes = await chatGet();
    assert.equal(statusRes.status, 200);
    const statusJson = (await statusRes.json()) as { status: string };
    assert.equal(statusJson.status, "ok");

    const streamReq = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.10.1" },
      body: JSON.stringify({
        message: "Juvederm Voluma",
        preferredProvider: "mock",
        stream: true,
      }),
    });
    const streamRes = await chatPost(streamReq);
    assert.equal(streamRes.status, 200);
    const ndjsonText = await streamRes.text();
    const events = ndjsonText
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { type: string });
    assert.ok(events.some((e) => e.type === "meta"));
    assert.ok(events.some((e) => e.type === "done"));

    const kRes = await knowledgeGet(new Request("http://localhost:3000/api/knowledge?clinicId=well-touch"));
    assert.equal(kRes.status, 200);
    const kJson = (await kRes.json()) as { records: Array<{ clinicIds: string[] }> };
    assert.ok(kJson.records.length > 0);
    assert.ok(kJson.records.every((r) => r.clinicIds.includes("well-touch")));

    const notFoundRes = await knowledgeGet(new Request("http://localhost:3000/api/knowledge?id=does-not-exist"));
    assert.equal(notFoundRes.status, 404);
  });
});

