/**
 * External search provider types.
 * Google Search is strictly secondary and optional; it must never override
 * official Terra Solutions company records, prices, or policies.
 */

export interface ExternalSearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  publishedAt?: string;
  /** Marks this as external, non-authoritative information. */
  isExternal: true;
}

export interface ExternalSearchResponse {
  available: boolean;
  results: ExternalSearchResult[];
  error?: string;
}

export interface SearchProvider {
  /** Search for external information safely on the server. */
  search(
    query: string,
    limit?: number,
    signal?: AbortSignal
  ): Promise<ExternalSearchResponse>;
  /** Whether server credentials are configured. */
  isAvailable(): boolean;
}
