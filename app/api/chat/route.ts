/**
 * Server-side AI Chat API Route.
 *
 * Pipeline:
 * 1. Rate limiting & request payload sanitization
 * 2. Conversation follow-up context resolution
 * 3. Server-only canonical knowledge retrieval + provenance extraction
 * 4. Optional PII-redacted secondary external Google search
 * 5. Gemini (or OpenAI) grounded generation with strict JSON schema validation
 * 6. Automatic resilient fallback to deterministic `localFallbackProvider` on any
 *    API key issue, timeout, rate limit, HTTP error, or invalid schema output
 * 7. Pre-validated progressive NDJSON streaming or JSON response
 */

import { NextResponse } from "next/server";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { resolveContextualQuery } from "@/lib/knowledge/context-query";
import { buildContextPackage } from "@/lib/ai/prompt-builder";
import {
  resolveServerAIProvider,
  localFallbackProvider,
} from "@/lib/ai/provider";
import { AIProviderError } from "@/lib/ai/gemini-provider";
import type { AIErrorCode } from "@/lib/ai/response-schema";
import { googleSearchProvider } from "@/lib/search/google-search";
import { TERRA_SYSTEM_PROMPT } from "@/lib/ai/prompts/terra-system-prompt";
import {
  checkRateLimit,
  extractClientKey,
  toSafeErrorMessage,
  validateChatRequestPayload,
} from "@/lib/security/api-guard";
import type { Message } from "@/types";
import type { AIRequest, AIResponse } from "@/lib/ai/types";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    assistantName: "Terra Solutions Assistant",
    externalSearchAvailable: googleSearchProvider.isAvailable(),
  });
}

function classifyProviderFailure(err: unknown): AIErrorCode {
  if (err instanceof AIProviderError) return err.category;
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  if (msg.includes("429") || msg.includes("rate limit")) return "GEMINI_RATE_LIMIT";
  if (msg.includes("timeout") || msg.includes("abort")) return "GEMINI_TIMEOUT";
  if (msg.includes("not configured") || msg.includes("api key")) return "MISSING_API_KEY";
  if (msg.includes("json") || msg.includes("schema")) return "INVALID_MODEL_RESPONSE";
  return "GEMINI_UNAVAILABLE";
}

async function generateWithFallback(
  provider: ReturnType<typeof resolveServerAIProvider>["provider"],
  aiRequest: AIRequest
): Promise<AIResponse> {
  if (provider.config.id === "local_fallback" || provider.config.id === "mock") {
    return localFallbackProvider.generateResponse(aiRequest);
  }

  try {
    return await provider.generateResponse(aiRequest);
  } catch (err) {
    // Re-throw if client intentionally cancelled generation via AbortController
    if (aiRequest.signal?.aborted) {
      throw err;
    }
    const category = classifyProviderFailure(err);
    const safeReason = toSafeErrorMessage(err);
    console.warn("[Terra AI Fallback Activated]", {
      failedProvider: provider.config.id,
      errorCategory: category,
      reason: safeReason,
    });

    const fallbackResponse = await localFallbackProvider.generateResponse(aiRequest);
    const notice =
      aiRequest.retrieval.classified.language === "ar"
        ? "تم إعداد الإجابة بالاعتماد على قاعدة المعرفة الداخلية."
        : "Response prepared using Terra's internal knowledge base.";

    fallbackResponse.warnings = Array.from(
      new Set([notice, ...fallbackResponse.warnings])
    );
    fallbackResponse.fallbackUsed = true;
    fallbackResponse.errorCategory = category;
    if (fallbackResponse.structured) {
      fallbackResponse.structured.meta = {
        ...fallbackResponse.structured.meta,
        provider: "local_fallback",
        fallbackReason: safeReason,
        errorCategory: category,
      };
    }
    return fallbackResponse;
  }
}

export async function POST(request: Request) {
  // 1. Rate limiting
  const clientKey = extractClientKey(request);
  const rate = checkRateLimit(clientKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait a moment before sending another query.",
        errorCategory: "INVALID_REQUEST",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rate.resetAtMs - Date.now()) / 1000))
          ),
        },
      }
    );
  }

  // 2. Payload validation & sanitization
  let rawBody = "";
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json(
      { error: "Unable to read request body.", errorCategory: "INVALID_REQUEST" },
      { status: 400 }
    );
  }

  const validated = validateChatRequestPayload(rawBody);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error, errorCategory: "INVALID_REQUEST" },
      { status: validated.status }
    );
  }

  const { message, history, includeExternalSearch, preferredProvider, stream } =
    validated.data;

  // 3. Follow-up context resolution + Server-side canonical knowledge retrieval
  const contextual = resolveContextualQuery(message, history);
  let retrieval: ReturnType<typeof knowledgeRetriever.retrieve>;
  try {
    retrieval = knowledgeRetriever.retrieve(contextual.effectiveQuery, { limit: 6 });
  } catch (err) {
    console.error("[Terra Knowledge Retrieval Error]", toSafeErrorMessage(err));
    return NextResponse.json(
      {
        error: "Internal knowledge retrieval error.",
        errorCategory: "KNOWLEDGE_RETRIEVAL_ERROR",
      },
      { status: 500 }
    );
  }

  // 4. Optional secondary external Google Search
  let externalResults = undefined;
  let externalSearchNote: string | undefined = undefined;
  if (includeExternalSearch) {
    const ext = await googleSearchProvider.search(
      contextual.effectiveQuery,
      3,
      request.signal
    );
    if (!ext.available) {
      externalSearchNote = ext.error;
    } else {
      externalResults = ext.results;
      if (ext.error) externalSearchNote = ext.error;
    }
  }

  const pkg = buildContextPackage(retrieval, {
    externalResults,
    externalSearchNote,
    contextualAnchors: contextual.extractedAnchors,
  });

  // 5. Provider resolution
  const resolved = resolveServerAIProvider(preferredProvider);
  const historyMessages: Message[] = history.map((h, idx) => ({
    id: `hist-${idx}`,
    role: h.role,
    content: h.content,
    timestamp: new Date().toISOString(),
    status: "sent",
  }));

  const aiRequest: AIRequest = {
    userMessage: message,
    conversationHistory: historyMessages,
    systemPrompt: TERRA_SYSTEM_PROMPT,
    contextPackage: pkg.contextPackage,
    retrieval,
    externalResults,
    externalSearchNote,
    signal: request.signal,
  };

  // 6. Generate & validate response BEFORE streaming so partial unvalidated JSON is never shown
  let finalResponse: AIResponse;
  try {
    finalResponse = await generateWithFallback(resolved.provider, aiRequest);
  } catch (err) {
    return NextResponse.json(
      {
        error: toSafeErrorMessage(err),
        errorCategory: classifyProviderFailure(err),
      },
      { status: 499 }
    );
  }

  // 7. Stream validated output progressively over NDJSON when requested
  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "meta",
                provider: finalResponse.provider,
                isMock: finalResponse.isMock,
                intent: finalResponse.intent,
                confidenceLevel: finalResponse.confidenceLevel,
                sources: finalResponse.sources,
                externalSources: finalResponse.externalSources,
                errorCategory: finalResponse.errorCategory,
              }) + "\n"
            )
          );

          const words = finalResponse.answer.split(/(\s+)/);
          let buf = "";
          for (let i = 0; i < words.length; i++) {
            if (request.signal.aborted) break;
            buf += words[i];
            if (i % 10 === 0 || i === words.length - 1) {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "delta", text: buf }) + "\n"
                )
              );
              buf = "";
            }
          }

          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "done",
                payload: finalResponse,
              }) + "\n"
            )
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                error: toSafeErrorMessage(err),
              }) + "\n"
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  // 8. Standard JSON response
  return NextResponse.json(finalResponse, { status: 200 });
}
