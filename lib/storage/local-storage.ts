/**
 * Safe localStorage wrapper.
 * Handles SSR, quota errors, corruption, and serialization.
 *
 * ⚠️  DEMO ONLY — localStorage is device/browser-specific and not
 *     shared between employees. A production deployment must use a
 *     proper backend database.
 */

function isAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = "__terra_storage_test__";
    window.localStorage.setItem(key, "1");
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON value from localStorage.
 * Returns `fallback` if the key is missing, the JSON is corrupt, or
 * localStorage is unavailable.
 */
export function getItem<T>(key: string, fallback: T): T {
  if (!isAvailable()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupted data — remove and return fallback
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

/**
 * Write a JSON-serialisable value to localStorage.
 * Silently fails if storage is unavailable or quota is exceeded.
 * Returns `true` on success, `false` on failure.
 */
export function setItem<T>(key: string, value: T): boolean {
  if (!isAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED")
    ) {
      console.warn(
        "[Terra Storage] Quota exceeded. Consider clearing old conversations."
      );
    }
    return false;
  }
}

/** Remove a key from localStorage. */
export function removeItem(key: string): void {
  if (!isAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Remove all Terra-prefixed keys from localStorage. */
export function clearAll(prefix = "terra_v1_"): void {
  if (!isAvailable()) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

