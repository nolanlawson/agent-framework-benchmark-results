// Server-side access to the PokeAPI. Responses are cached in memory for a short time and
// refreshed in the background once stale, so pages stay fast while following live data.

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");
const FRESH_MS = 60_000;

type Entry = { promise: Promise<unknown>; fetchedAt: number };
const cache = new Map<string, Entry>();

export class NotFoundError extends Error {}

export function apiBaseUrl() {
  return API_BASE_URL;
}

function toUrl(pathOrUrl: string) {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/?(api\/v2\/)?/, "")}`;
}

async function load(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (res.status === 404) throw new NotFoundError(url);
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
  return res.json();
}

function refresh(url: string, previous?: Entry): Entry {
  const entry: Entry = { promise: load(url), fetchedAt: Date.now() };
  cache.set(url, entry);
  entry.promise.catch(() => {
    // Don't cache failures; keep serving the previous value if there was one.
    if (cache.get(url) !== entry) return;
    if (previous) cache.set(url, previous);
    else cache.delete(url);
  });
  return entry;
}

/** GET a PokeAPI resource by path (`pokemon/25`) or absolute URL. Throws NotFoundError on 404. */
export async function get<T = any>(pathOrUrl: string): Promise<T> {
  const url = toUrl(pathOrUrl);
  const entry = cache.get(url);
  if (!entry) return refresh(url).promise as Promise<T>;
  if (Date.now() - entry.fetchedAt > FRESH_MS) {
    const next = refresh(url, entry);
    // Serve the stale value while revalidating, unless the stale one was a 404.
    return entry.promise.then(
      (value) => {
        next.promise.catch(() => {});
        return value as T;
      },
      () => next.promise as Promise<T>,
    );
  }
  return entry.promise as Promise<T>;
}

/** GET a resource, returning null when the API has no such resource. */
export async function getOrNull<T = any>(pathOrUrl: string): Promise<T | null> {
  try {
    return await get<T>(pathOrUrl);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/** All entries of a list endpoint. */
export async function getList(resource: string): Promise<{ name: string; url: string }[]> {
  const page = await get<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000`);
  return page.results;
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}
