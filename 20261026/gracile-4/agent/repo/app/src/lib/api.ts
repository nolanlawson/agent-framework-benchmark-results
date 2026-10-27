// Server-side access to the PokéAPI. Every response is fetched over HTTP at request time
// and kept in a short-lived in-memory cache, so changes in the API show up quickly.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const TTL_MS = 60_000;
const MAX_ENTRIES = 5000;
const MAX_CONCURRENT = 24;

type Entry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

let active = 0;
const queue: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
	if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
	active++;
	try {
		return await task();
	} finally {
		active--;
		queue.shift()?.();
	}
}

async function load(url: string): Promise<unknown> {
	return withSlot(async () => {
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (res.status === 404) {
			await res.body?.cancel();
			return null;
		}
		if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
		return res.json();
	});
}

/** GET `/api/v2/<path>`. Resolves to `null` when the resource doesn't exist. */
export function api<T>(path: string): Promise<T | null> {
	const url = `${API_BASE_URL}/api/v2/${path.replace(/^\//, '')}`;
	const now = Date.now();
	const hit = cache.get(url);
	if (hit && hit.expires > now) {
		// Refresh recency for the LRU eviction below.
		cache.delete(url);
		cache.set(url, hit);
		return hit.value as Promise<T | null>;
	}
	const value = load(url);
	cache.set(url, { expires: now + TTL_MS, value });
	// Don't keep failures around.
	value.catch(() => cache.delete(url));
	if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
	return value as Promise<T | null>;
}

/** Like `api`, but throws when the resource is missing. */
export async function apiRequired<T>(path: string): Promise<T> {
	const data = await api<T>(path);
	if (data === null) throw new Error(`Missing API resource: ${path}`);
	return data;
}

/** Path of an API URL relative to `/api/v2/`, e.g. `pokemon/25/`. */
export const apiPath = (url: string) => url.replace(/^.*\/api\/v2\//, '');

/** Numeric ID at the end of an API resource URL. */
export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const mediaUrl = (path: string) => `${API_BASE_URL}/media/${path}`;

/** Front sprite of a (default) Pokémon. */
export const spriteUrl = (pokemonId: number) => mediaUrl(`sprites/pokemon/${pokemonId}.png`);
