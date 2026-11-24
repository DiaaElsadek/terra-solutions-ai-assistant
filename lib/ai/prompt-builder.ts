/**
 * Prompt builder — constructs the full prompt with system instructions
 * and knowledge context for the AI provider.
 */

import type { Message } from "@/types";
import type { SearchResult } from "@/types/knowledge";
import { SYSTEM_PROMPT } from "@/constants/prompts";

/**
 * Build the system prompt with injected knowledge context.
 */
export function buildSystemPrompt(knowledgeResults: SearchResult[]): string {
  if (knowledgeResults.length === 0) {
    return (
      SYSTEM_PROMPT +
      "\n\nIMPORTANT: No relevant information was found in the knowledge base for this query. " +
      "Inform the user that the specific information they requested is not available in the current dataset, " +
      "and suggest they rephrase or ask about a different topic."
    );
  }

  const contextParts = knowledgeResults.map((result, idx) => {
    const r = result.record;
    return [
      `--- Source ${idx + 1}: [${r.category}] ${r.title} ---`,
      r.content,
      `(Source: ${r.source.sheet}, relevance: ${result.score.toFixed(1)})`,
    ].join("\n");
  });

  return [
    SYSTEM_PROMPT,
    "",
    "=== RETRIEVED KNOWLEDGE CONTEXT ===",
    "Use the following company knowledge to answer the user's question.",
    "Reference the source categories when presenting information.",
    "",
    ...contextParts,
    "",
    "=== END OF KNOWLEDGE CONTEXT ===",
  ].join("\n");
}

/**
 * Format conversation history for the AI provider.
 * Trims to the most recent messages to stay within context limits.
 */
export function formatConversationHistory(
  messages: Message[],
  maxMessages = 20
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => m.role !== "system" && m.status !== "error")
    .slice(-maxMessages)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

