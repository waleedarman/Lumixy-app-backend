type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

export type CachedRequestOptions<T> = {
  staleTtlMs?: number;
  onRevalidate?: (data: T) => void;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 30_000;
const DEFAULT_STALE_TTL_MS = 300_000;

function storeCacheEntry<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function revalidateCacheEntry<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  onRevalidate?: (data: T) => void,
) {
  if (inflight.has(key)) {
    return inflight.get(key) as Promise<T>;
  }

  const promise = fetcher()
    .then((data) => {
      storeCacheEntry(key, data, ttlMs);
      inflight.delete(key);
      onRevalidate?.(data);
      return data;
    })
    .catch((error) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, promise);
  return promise;
}

export function peekRequestCache<T>(key: string): T | null {
  const hit = cache.get(key);
  if (!hit || hit.expiresAt <= Date.now()) {
    return null;
  }

  return hit.data as T;
}

export function peekStaleRequestCache<T>(key: string, maxStaleMs = DEFAULT_STALE_TTL_MS): T | null {
  const hit = cache.get(key);
  if (!hit) {
    return null;
  }

  if (Date.now() <= hit.expiresAt + maxStaleMs) {
    return hit.data as T;
  }

  return null;
}

export async function cachedRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
  options?: CachedRequestOptions<T>,
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  const staleTtlMs = options?.staleTtlMs ?? DEFAULT_STALE_TTL_MS;

  if (hit && hit.expiresAt > now) {
    return hit.data as T;
  }

  if (hit && now <= hit.expiresAt + staleTtlMs) {
    void revalidateCacheEntry(key, fetcher, ttlMs, options?.onRevalidate).catch(() => undefined);
    return hit.data as T;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending as Promise<T>;
  }

  return revalidateCacheEntry(key, fetcher, ttlMs, options?.onRevalidate);
}

export function invalidateRequestCache(keyOrPrefix?: string) {
  if (!keyOrPrefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key === keyOrPrefix || key.startsWith(`${keyOrPrefix}:`)) {
      cache.delete(key);
    }
  }
}
