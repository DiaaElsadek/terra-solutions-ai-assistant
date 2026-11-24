/**
 * Server-side AI Chat API Route Contract (Prepared for Future Backend Integration).
 *
 * Security design:
 * - Secret LLM API keys (OPENAI_API_KEY, GOOGLE_AI_API_KEY, etc.) live ONLY
 *   in server environment variables (never NEXT_PUBLIC_* or localStorage).
 * - This endpoint validates requests and performs retrieval on the server,
 *   then forwards prompts to the configured upstream LLM provider when present.
 */

import { NextResponse } from "next/server";
import { knowledgeEngine } from "@/lib/knowledge";
import { buildSystemPrompt } from "@/lib/ai/prompt-builder";

interface ChatApiRequestBody {
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatApiRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    // Retrieve verified company knowledge context server-side
    const results = knowledgeEngine.search(message, { limit: 5 });
    const systemPrompt = buildSystemPrompt(results);

    // Check whether an upstream LLM key is configured on the server
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
    const hasGoogleAI = Boolean(process.env.GOOGLE_AI_API_KEY);

    if (!hasOpenAI && !hasGoogleAI) {
      return NextResponse.json(
        {
          configured: false,
          message:
            "No upstream LLM API key is configured on the server. Configure OPENAI_API_KEY or GOOGLE_AI_API_KEY in .env.local to enable live LLM synthesis.",
          retrievedCount: results.length,
          systemPromptLength: systemPrompt.length,
        },
        { status: 501 }
      );
    }

    // Ready for upstream provider call when API key is configured:
    // Forward `systemPrompt`, `body.history`, and `message` to your chosen LLM SDK.
    return NextResponse.json(
      {
        configured: true,
        message:
          "Upstream LLM key detected. Connect your preferred SDK call in app/api/chat/route.ts.",
        retrievedCount: results.length,
      },
      { status: 501 }
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 }
    );
  }
}

