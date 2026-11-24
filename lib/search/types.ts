/**
 * External search provider interface.
 * Prepared for future Google Custom Search or similar integration.
 *
 * ⚠️  Not implemented in the initial frontend-only release.
 *     The API key must be stored server-side and accessed via
 *     a Next.js API route — never from the browser.
 */

export interface ExternalSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  /** Marks this as external, non-authoritative information. */
  isExternal: true;
}

export interface SearchProvider {
  /** Search for external information. Returns empty array if unavailable. */
  search(query: string, limit?: number): Promise<ExternalSearchResult[]>;
  /** Whether the provider is currently configured and available. */
  isAvailable(): boolean;
}

/**
 * Stub search provider — returns no results.
 * Replace with a real implementation when Google Search API is configured.
 */
export const stubSearchProvider: SearchProvider = {
  async search(): Promise<ExternalSearchResult[]> {
    return [];
  },
  isAvailable(): boolean {
    return false;
  },
};

