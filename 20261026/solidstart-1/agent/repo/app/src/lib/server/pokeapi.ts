// Server-only PokeAPI client. Every response is fetched over HTTP at request time and
// kept in a short-lived in-memory cache; concurrent requests for the same URL share
// one fetch.

const CACHE_TTL_MS = 60_000;
const MAX_CONCURRENT = 24;

export const apiBase = () => (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");

export class NotFoundError extends Error {}

type Entry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

let active = 0;
const waiting: (() => void)[] = [];

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

function resolveUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.replace(/^\/+/, "").replace(/^api\/v2\//, "");
  return `${apiBase()}/api/v2/${path}`;
}

/** GET a PokeAPI resource by path (`pokemon/25`) or absolute URL. Rejects with NotFoundError on 404. */
export function api<T = any>(pathOrUrl: string): Promise<T> {
  const url = resolveUrl(pathOrUrl);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  const value = limited(async () => {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 404) {
      await res.body?.cancel();
      throw new NotFoundError(url);
    }
    if (!res.ok) throw new Error(`PokeAPI ${res.status} for ${url}`);
    return res.json();
  });
  cache.set(url, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  return value as Promise<T>;
}

/** Like `api`, but resolves to null when the resource doesn't exist. */
export async function apiOrNull<T = any>(pathOrUrl: string): Promise<T | null> {
  try {
    return await api<T>(pathOrUrl);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/** Every entry of a list endpoint. */
export async function apiList(resource: string): Promise<{ name: string; url: string }[]> {
  const page = await api<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000&offset=0`);
  return page.results;
}

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`;
