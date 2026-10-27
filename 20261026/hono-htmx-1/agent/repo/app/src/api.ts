// Thin client for the PokeAPI server with a short-lived in-memory cache.
// All data is fetched over HTTP at request time; nothing is read from disk.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const TTL_MS = 60_000;
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

export class NotFoundError extends Error {}

function toUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE_URL}/api/v2/${path.replace(/^\/?(api\/v2\/)?/, '')}`;
}

async function load(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (res.status === 404) {
    await res.body?.cancel();
    throw new NotFoundError(url);
  }
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`API ${res.status} for ${url}`);
  }
  return res.json();
}

/** GET a resource path (`pokemon/25`) or absolute API URL; throws NotFoundError on 404. */
export function get<T = any>(path: string): Promise<T> {
  const url = toUrl(path);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = load(url);
  cache.set(url, { expires: now + TTL_MS, value });
  // Don't keep failures around.
  value.catch(() => cache.delete(url));
  return value as Promise<T>;
}

/** Like get(), but resolves to null when the resource doesn't exist. */
export async function find<T = any>(path: string): Promise<T | null> {
  try {
    return await get<T>(path);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/** Every entry of a list endpoint. */
export async function list(resource: string): Promise<{ name: string; url: string }[]> {
  const page = await get<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000`);
  return page.results;
}

/** Root-relative media paths become absolute URLs on the API server. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_BASE_URL}${path}`;
}
