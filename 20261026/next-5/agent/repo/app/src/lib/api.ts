import { connection } from 'next/server';
import { englishName, idFromUrl } from './format';

// All data comes from the PokeAPI server at request time. Responses are kept in memory
// for a short while so a page that needs dozens of records (or many concurrent requests)
// doesn't hammer the API, while changes upstream still show up within seconds.

const TTL_MS = 30_000;
const MAX_ENTRIES = 3000;

type Entry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

export function apiBaseUrl(): string {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
}

export class NotFoundError extends Error {}

function prune(now: number) {
  for (const [key, entry] of cache) {
    if (entry.expires <= now) cache.delete(key);
  }
  // Still too big: drop the oldest entries (Map iterates in insertion order).
  for (const key of cache.keys()) {
    if (cache.size <= MAX_ENTRIES) break;
    cache.delete(key);
  }
}

async function load(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) throw new NotFoundError(url);
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
  return res.json();
}

/** GETs `/api/v2/<path>` (or an API URL from a response); throws NotFoundError on 404. */
export async function api<T = any>(path: string): Promise<T> {
  await connection();
  // Absolute URLs from API responses are re-rooted on API_BASE_URL.
  const rel = path.startsWith('http') ? path.slice(path.indexOf('/api/v2/') + '/api/v2/'.length) : path;
  const url = `${apiBaseUrl()}/api/v2/${rel.replace(/^\//, '')}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  const value = load(url);
  cache.set(url, { expires: now + TTL_MS, value });
  if (cache.size > MAX_ENTRIES) prune(now);
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  return value as Promise<T>;
}

/** Like api(), but resolves to null when the resource doesn't exist. */
export async function apiOrNull<T = any>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

/** Every entry of a list endpoint. */
export async function apiList(resource: string): Promise<{ name: string; url: string }[]> {
  const data = await api<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000`);
  return data.results;
}

// ---------------------------------------------------------------------------
// Shared lookups

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export type TypeInfo = { name: string; label: string };

/** The 18 types in API order, with English names and their full records. */
export async function getTypeRecords(): Promise<(TypeInfo & { data: any })[]> {
  const list = (await apiList('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  return Promise.all(
    list.map(async (t) => {
      const data = await api(t.url);
      return { name: t.name, label: englishName(data.names) ?? t.name, data };
    }),
  );
}

export async function getTypes(): Promise<TypeInfo[]> {
  return (await getTypeRecords()).map(({ name, label }) => ({ name, label }));
}

export async function getTypeLabels(): Promise<Map<string, string>> {
  return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

/** species id -> species name, for every species the API lists. */
export async function getSpeciesNames(): Promise<Map<number, string>> {
  const list = await apiList('pokemon-species');
  const map = new Map<number, string>();
  for (const s of list) {
    const id = idFromUrl(s.url);
    if (id) map.set(id, s.name);
  }
  return map;
}
