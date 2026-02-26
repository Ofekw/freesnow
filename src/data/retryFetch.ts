interface RetryFetchOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
  /** Cache TTL in ms. Default 5 min. Set to 0 to disable caching. */
  cacheTtlMs?: number;
}

const DEFAULT_MAX_RETRIES = 8;
const DEFAULT_BASE_DELAY_MS = 400;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/* ── Response cache + in-flight deduplication ──── */

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * Build a cache key from URL + RequestInit so that different methods/bodies
 * on the same URL don't collide.  All current callers are GETs with no init,
 * but this guards against future misuse.
 */
function cacheKey(url: string, init?: RequestInit): string {
  if (!init) return url;
  // Include method + body (covers POST/PUT with different payloads)
  const method = init.method?.toUpperCase() ?? 'GET';
  if (method === 'GET' && !init.body) return url;
  return `${method}:${url}:${init.body ?? ''}`;
}

/**
 * Clear all cached responses so the next fetch hits the network.
 * In-flight requests are left alone — they will resolve naturally and
 * populate the (now-empty) cache when they complete.
 */
export function clearFetchCache(): void {
  responseCache.clear();
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1000);
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, retryAt - Date.now());
}

function retryDelayMs(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  retryAfterHeader: string | null,
): number {
  const exponential = Math.min(baseDelayMs * (2 ** attempt), maxDelayMs);
  const retryAfter = parseRetryAfterMs(retryAfterHeader);
  return Math.max(exponential, retryAfter ?? 0);
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJSONWithRetry<T>(
  url: string,
  init?: RequestInit,
  options: RetryFetchOptions = {},
): Promise<T> {
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const key = cacheKey(url, init);

  // Check response cache
  if (cacheTtlMs > 0) {
    const cached = responseCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    // Deduplicate concurrent requests to the same URL + init.
    // NOTE: There is a narrow race window where a request can fail and its
    // `finally` block hasn't run yet — a new caller arriving in that gap
    // could miss the inflight entry and start a duplicate fetch.  This is
    // harmless (just an extra network call) and not worth the complexity of
    // fixing with extra synchronisation.
    const inflight = inflightRequests.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const doFetch = async (): Promise<T> => {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    const label = options.label ?? 'HTTP';

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, init);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`${label} request failed`);
        if (attempt === maxRetries) throw lastError;
        await sleep(retryDelayMs(attempt, baseDelayMs, maxDelayMs, null));
        continue;
      }

      if (res.ok) {
        return res.json() as Promise<T>;
      }

      const httpError = new Error(`${label} ${res.status}: ${res.statusText}`);
      if (!shouldRetryStatus(res.status) || attempt === maxRetries) {
        throw httpError;
      }

      lastError = httpError;
      await sleep(
        retryDelayMs(
          attempt,
          baseDelayMs,
          maxDelayMs,
          res.headers.get('Retry-After'),
        ),
      );
    }

    throw lastError ?? new Error(`${label} request failed`);
  };

  if (cacheTtlMs > 0) {
    const promise = doFetch();
    inflightRequests.set(key, promise);
    try {
      const result = await promise;
      responseCache.set(key, { data: result, expiresAt: Date.now() + cacheTtlMs });
      return result;
    } finally {
      inflightRequests.delete(key);
    }
  }

  return doFetch();
}
