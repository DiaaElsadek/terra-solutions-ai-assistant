/**
 * Server-side AI Chat API Route.
 *
 * Security & Reliability Controls:
 * - Rate limiting (sliding-window per client IP)
 * - Body byte-size & message length caps + sanitization
 * - Server-only knowledge retrieval (never exposes raw files in public/)
 * - Optional Google Custom Search (strictly secondary, PII-redacted)
 * - OpenAI / Gemini / Deterministic Knowledge Search Mode orchestration
 * - NDJSON progressive streaming with AbortSignal handling & safe error redaction
 */

import { NextResponse } from "next/server";
import { knowledgeRetriever } from "@/lib/knowledge/retriever";
import { buildContextPackage } from "@/lib/ai/prompt-builder";
import { resolveServerAIProvider } from "@/lib/ai/provider";
import { googleSearchProvider } from "@/lib/search/google-search";
import { SYSTEM_PROMPT } from "@/constants/prompts";
import {
  checkRateLimit,
  extractClientKey,
  toSafeErrorMessage,
  validateChatRequestPayload,
} from "@/lib/security/api-guard";
import type { Message } from "@/types";

export async function GET() {
  const { provider, fallbackUsed, reason } = resolveServerAIProvider("auto");
  return NextResponse.json({
    status: "ok",
    activeProvider: provider.config.id,
    providerName: provider.config.name,
    isMock: provider.config.isMock,
    externalSearchAvailable: googleSearchProvider.isAvailable(),
    reason: fallbackUsed ? reason : undefined,
  });
}

export async function POST(request: Request) {
  // 1. Rate limiting
  const clientKey = extractClientKey(request);
  const rate = checkRateLimit(clientKey);
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Please wait a moment before sending another query.",
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
      { error: "Unable to read request body." },
      { status: 400 }
    );
  }

  const validated = validateChatRequestPayload(rawBody);
  if (!validated.ok) {
    return NextResponse.json(
      { error: validated.error },
      { status: validated.status }
    );
  }

  const { message, history, includeExternalSearch, preferredProvider, stream } =
    validated.data;

  // 3. Server-side retrieval
  const retrieval = knowledgeRetriever.retrieve(message, { limit: 6 });

  // 4. Optional secondary external Google Search
  let externalResults = undefined;
  let externalSearchNote: string | undefined = undefined;
  if (includeExternalSearch) {
    const ext = await googleSearchProvider.search(message, 3, request.signal);
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
  });

  // 5. Provider resolution
  const resolved = resolveServerAIProvider(preferredProvider);
  const provider = resolved.provider;

  const historyMessages: Message[] = history.map((h, idx) => ({
    id: `hist-${idx}`,
    role: h.role,
    content: h.content,
    timestamp: new Date().toISOString(),
    status: "sent",
  }));

  const aiRequest = {
    userMessage: message,
    conversationHistory: historyMessages,
    systemPrompt: SYSTEM_PROMPT,
    contextPackage: pkg.contextPackage,
    retrieval,
    externalResults,
    externalSearchNote,
    signal: request.signal,
  };

  // 6. Streaming NDJSON response
  if (stream && provider.streamResponse) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "meta",
                provider: provider.config.name,
                isMock: provider.config.isMock,
                intent: retrieval.classified.intent,
                confidenceLevel: retrieval.confidence,
                sources: pkg.sources,
                externalSources: pkg.externalSources,
              }) + "\n"
            )
          );

          for await (const chunk of provider.streamResponse!(aiRequest)) {
            if (request.signal.aborted) break;
            if (chunk.type === "delta") {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({ type: "delta", text: chunk.text }) + "\n"
                )
              );
            } else if (chunk.type === "complete") {
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "done",
                    payload: chunk.response,
                  }) + "\n"
                )
              );
            }
          }
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

  // 7. Standard JSON response
  try {
    const aiResponse = await provider.generateResponse(aiRequest);
    return NextResponse.json(aiResponse, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: toSafeErrorMessage(err) },
      { status: 502 }
    );
  }
}
