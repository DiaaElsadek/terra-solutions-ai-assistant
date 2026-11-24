/**
 * Deterministic Local Fallback Adapter.
 * Delegates to `localFallbackProvider` while preserving backward-compatible `mockProvider` export.
 */

import { localFallbackProvider } from "./providers/local-fallback-provider";

export const mockProvider = localFallbackProvider;
