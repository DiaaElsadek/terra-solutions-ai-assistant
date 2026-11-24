/**
 * Server-side API request validation and sliding-window rate limiter.
 *
 * NOTE: Rate limiting uses an in-memory Map per Node worker. For multi-instance
 * horizontal deployments, back this interface with Redis/Upstash.
 */

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetAtMs: number;
}

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30;  // 30 requests/minute per IP

const requestBuckets = new Map<string, number[]>();

export function extractClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "local-client";
}

export function checkRateLimit(
  clientKey: string,
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS
): RateLimitDecision {
  const now = Date.now();
  const windowStart = now - windowMs;
  const timestamps = (requestBuckets.get(clientKey) || []).filter(
    (t) => t > windowStart
  );

  if (timestamps.length >= maxRequests) {
    requestBuckets.set(clientKey, timestamps);
    return {
      allowed: false,
      remaining: 0,
      resetAtMs: (timestamps[0] ?? now) + windowMs,
    };
  }

  timestamps.push(now);
  requestBuckets.set(clientKey, timestamps);

  // Prevent unbounded memory growth across many unique IPs
  if (requestBuckets.size > 5000) {
    const oldestKey = requestBuckets.keys().next().value;
    if (oldestKey) requestBuckets.delete(oldestKey);
  }

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - timestamps.length),
    resetAtMs: now + windowMs,
  };
}

/** Clear rate limit buckets (for automated testing). */
export function resetRateLimits(): void {
  requestBuckets.clear();
}

export const API_LIMITS = {
  maxBodyBytes: 32 * 1024, // 32 KB
  maxMessageLength: 2000,
  maxHistoryTurns: 16,
  maxHistoryMessageLength: 4000,
} as const;

/** Strip ASCII control characters (preserving newlines/tabs) and normalize whitespace. */
export function sanitizeUserText(input: string): string {
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

export interface ValidatedChatPayload {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  includeExternalSearch: boolean;
  preferredProvider?: "auto" | "openai" | "gemini" | "mock";
  stream?: boolean;
}

export function validateChatRequestPayload(
  rawText: string
): { ok: true; data: ValidatedChatPayload } | { ok: false; error: string; status: number } {
  if (Buffer.byteLength(rawText, "utf8") > API_LIMITS.maxBodyBytes) {
    return {
      ok: false,
      error: "Request body exceeds maximum allowed size (32 KB).",
      status: 413,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: "Invalid JSON payload.", status: 400 };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Payload must be a JSON object.", status: 400 };
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.message !== "string") {
    return { ok: false, error: "Message field must be a string.", status: 400 };
  }

  const message = sanitizeUserText(obj.message);
  if (!message) {
    return { ok: false, error: "Message cannot be empty.", status: 400 };
  }
  if (message.length > API_LIMITS.maxMessageLength) {
    return {
      ok: false,
      error: `Message exceeds ${API_LIMITS.maxMessageLength} characters.`,
      status: 400,
    };
  }

  const rawHistory = Array.isArray(obj.history) ? obj.history : [];
  const history: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of rawHistory.slice(-API_LIMITS.maxHistoryTurns)) {
    if (!item || typeof item !== "object") continue;
    const turn = item as Record<string, unknown>;
    if (
      (turn.role === "user" || turn.role === "assistant") &&
      typeof turn.content === "string"
    ) {
      const cleaned = sanitizeUserText(turn.content).slice(
        0,
        API_LIMITS.maxHistoryMessageLength
      );
      if (cleaned) {
        history.push({ role: turn.role, content: cleaned });
      }
    }
  }

  const preferredProvider =
    obj.preferredProvider === "openai" ||
    obj.preferredProvider === "gemini" ||
    obj.preferredProvider === "mock" ||
    obj.preferredProvider === "auto"
      ? obj.preferredProvider
      : "auto";

  return {
    ok: true,
    data: {
      message,
      history,
      includeExternalSearch: obj.includeExternalSearch === true,
      preferredProvider,
      stream: obj.stream === true,
    },
  };
}

/** Produce a safe error message guaranteed not to leak environment keys or raw stack traces. */
export function toSafeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) {
    return "An unexpected server error occurred.";
  }
  const msg = err.message
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, "[REDACTED_KEY]")
    .replace(/AIza[0-9A-Za-z_-]{15,}/g, "[REDACTED_KEY]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]");
  if (msg.length > 220) {
    return msg.slice(0, 220) + "…";
  }
  return msg;
}

