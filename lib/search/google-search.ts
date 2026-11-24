/**
 * Optional server-side Google Custom Search provider.
 *
 * Security & Trust Rules:
 * - Reads GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID from server env ONLY.
 * - Redacts customer PII before transmitting queries externally.
 * - Uses strict timeouts via AbortSignal.
 * - Clearly marks all returned items as `isExternal: true` and returns
 *   `available: false` when unconfigured (never fakes Google search results).
 */

import { redactCustomerPII } from "@/lib/security/privacy";
import { toSafeErrorMessage } from "@/lib/security/api-guard";
import type {
  ExternalSearchResponse,
  ExternalSearchResult,
  SearchProvider,
} from "./types";

const SEARCH_TIMEOUT_MS = 6000;

interface GoogleSearchApiItem {
  title?: string;
  snippet?: string;
  link?: string;
  displayLink?: string;
  pagemap?: {
    metatags?: Array<Record<string, string>>;
  };
}

interface GoogleSearchApiPayload {
  items?: GoogleSearchApiItem[];
}

export const googleSearchProvider: SearchProvider = {
  isAvailable(): boolean {
    if (typeof window !== "undefined") return false;
    return Boolean(
      process.env.GOOGLE_SEARCH_API_KEY?.trim() &&
        process.env.GOOGLE_SEARCH_ENGINE_ID?.trim()
    );
  },

  async search(
    rawQuery: string,
    limit = 3,
    externalSignal?: AbortSignal
  ): Promise<ExternalSearchResponse> {
    if (!this.isAvailable()) {
      return {
        available: false,
        results: [],
        error:
          "External Google Search is unavailable (GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID are not configured on the server).",
      };
    }

    const cleaned = redactCustomerPII(rawQuery.trim()).sanitized.slice(0, 240);
    if (!cleaned) {
      return { available: true, results: [] };
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY!.trim();
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID!.trim();
    const count = Math.min(Math.max(1, limit), 5);

    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", cx);
    url.searchParams.set("q", cleaned);
    url.searchParams.set("num", String(count));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    externalSignal?.addEventListener("abort", onAbort, { once: true });

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          available: true,
          results: [],
          error: `External search returned HTTP ${res.status}.`,
        };
      }

      const data = (await res.json()) as GoogleSearchApiPayload;
      const results: ExternalSearchResult[] = (data.items || [])
        .filter((item) => item.title && item.link)
        .map((item) => {
          const meta = item.pagemap?.metatags?.[0];
          const publishedAt =
            meta?.["article:published_time"] || meta?.["date"] || undefined;
          return {
            title: String(item.title),
            snippet: String(item.snippet || "").trim(),
            url: String(item.link),
            source: String(item.displayLink || "Google Web Search"),
            publishedAt,
            isExternal: true,
          };
        });

      return { available: true, results };
    } catch (err) {
      return {
        available: true,
        results: [],
        error: `External search error: ${toSafeErrorMessage(err)}`,
      };
    } finally {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", onAbort);
    }
  },
};

