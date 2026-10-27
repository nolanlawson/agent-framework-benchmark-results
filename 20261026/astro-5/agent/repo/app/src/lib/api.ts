// Runtime client for the PokeAPI server. Responses are cached in memory for a short
// time (stale-while-revalidate), never at build time.

export const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');

const FRESH_MS = 60_000;
const MAX_CONCURRENT = 32;
const MAX_ENTRIES = 5000;

type Entry = { time: number; promise: Promise<any>; refreshing?: boolean };
const cache = new Map<string, Entry>();

// Simple semaphore so a page that needs many records doesn't flood the API.
let active = 0;
const queue: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

async function load(path: string): Promise<any> {
  return withSlot(async () => {
    const res = await fetch(`${API_BASE_URL}/api/v2/${path}`);
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) throw new Error(`API ${path} responded with ${res.status}`);
    return res.json();
  });
}

/** Fetches `/api/v2/<path>`. Resolves to `null` when the API has no such resource. */
export function api<T = any>(path: string): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.time < FRESH_MS) return hit.promise;

  if (hit) {
    // Serve the stale value while a fresh one loads in the background.
    if (!hit.refreshing) {
      hit.refreshing = true;
      const promise = load(path);
      promise.then(
        () => cache.set(path, { time: Date.now(), promise }),
        () => (hit.refreshing = false),
      );
    }
    return hit.promise;
  }

  const entry: Entry = { time: Date.now(), promise: load(path) };
  entry.promise.catch(() => {
    if (cache.get(path) === entry) cache.delete(path);
  });
  cache.set(path, entry);
  // Maps iterate in insertion order, so this drops the oldest entry.
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return entry.promise;
}

export const resourcePath = (resource: string, key: string | number) =>
  `${resource}/${encodeURIComponent(String(key).toLowerCase())}/`;

export const listPath = (resource: string) => `${resource}/?limit=100000`;

/** The numeric ID at the end of an API URL. */
export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const spriteUrl = (pokemonId: number) => `${API_BASE_URL}/media/sprites/pokemon/${pokemonId}.png`;

/** Run `fn` over items with all calls in flight at once (the semaphore limits real concurrency). */
export const mapAll = <T, R>(items: T[], fn: (item: T) => Promise<R>) => Promise.all(items.map(fn));
