// Lightweight fetch helper with timeout and optional in-memory cache.
// Suitable for client usage in PetReunion.

type CacheEntry<T> = { data: T; ts: number };
const cache = new Map<string, CacheEntry<any>>();

interface FetchOptions<T> {
  cacheTtlMs?: number;
  timeoutMs?: number;
  parser?: (res: Response) => Promise<T>;
}

export async function fetchJson<T = any>(url: string, opts: FetchOptions<T> = {}): Promise<T> {
  const { cacheTtlMs = 30_000, timeoutMs = 8_000, parser } = opts;
  const now = Date.now();

  const cached = cache.get(url);
  if (cached && now - cached.ts < cacheTtlMs) {
    return cached.data as T;
  }

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = parser ? await parser(res) : await res.json();
    cache.set(url, { data, ts: now });
    return data as T;
  } finally {
    clearTimeout(to);
  }
}

