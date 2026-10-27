// Server-only PokeAPI client with a small in-memory cache.
//
// The API is treated as a live service: responses are kept for a short time only, so
// changes show up quickly, while a burst of page views (or the dozens of requests a
// single page needs) doesn't hit the API repeatedly.

const FRESH_MS = 30_000;
const MAX_ENTRIES = 3_000;

interface Entry {
  expires: number;
  value: Promise<unknown>;
}

const cache = new Map<string, Entry>();

export function apiBase(): string {
  return (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");
}

/** Turns an absolute API URL from the data (or a bare path) into a cache key like `pokemon/25`. */
function toKey(pathOrUrl: string): string {
  const path = pathOrUrl.includes("/api/v2/") ? pathOrUrl.split("/api/v2/")[1] : pathOrUrl;
  return path.replace(/^\/+/, "").replace(/\/+(\?|$)/, "$1");
}

async function load(key: string): Promise<unknown> {
  const [path, query] = key.split("?");
  const res = await fetch(`${apiBase()}/api/v2/${path}/${query ? `?${query}` : ""}`);
  if (res.status === 404) {
    await res.body?.cancel();
    return null;
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`PokeAPI responded ${res.status} for ${key}`);
  }
  return res.json();
}

/** Fetches an API resource. Resolves to `null` when the API responds 404. */
export function api<T>(pathOrUrl: string): Promise<T | null> {
  const key = toKey(pathOrUrl);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) {
    // Refresh the entry's position so frequently used resources survive eviction.
    cache.delete(key);
    cache.set(key, hit);
    return hit.value as Promise<T | null>;
  }

  const entry: Entry = { expires: now + FRESH_MS, value: load(key) };
  entry.value.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return entry.value as Promise<T | null>;
}

/** Like `api`, but for resources that must exist. */
export async function apiRequired<T>(pathOrUrl: string): Promise<T> {
  const value = await api<T>(pathOrUrl);
  if (value === null) throw new Error(`PokeAPI resource not found: ${pathOrUrl}`);
  return value;
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}

export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

// Drop expired entries now and then so the cache doesn't hold on to large records.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
}, 60_000).unref?.();
