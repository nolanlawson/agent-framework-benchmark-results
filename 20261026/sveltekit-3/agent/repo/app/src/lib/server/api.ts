// HTTP client for the PokeAPI server with a small in-memory cache.
//
// The API is treated as a live service: entries are fresh for FRESH_MS, then served
// stale (while being refreshed in the background) for up to STALE_MS, after which a
// request waits for new data. Callers cache a trimmed view of each response rather
// than the raw JSON, since some records (e.g. /pokemon/) are hundreds of kilobytes.

import { API_BASE_URL } from '$app/env/private';

const FRESH_MS = 60_000;
const STALE_MS = 10 * 60_000;
const MAX_ENTRIES = 5_000;
const MAX_CONCURRENT_REQUESTS = 32;

interface Entry<T> {
	value: Promise<T>;
	fetchedAt: number;
	refreshing: boolean;
}

const cache = new Map<string, Entry<unknown>>();

/**
 * Returns the value cached under `key`, computing it with `load` when missing or expired.
 * Failed loads are not cached.
 */
export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
	const now = Date.now();
	const entry = cache.get(key) as Entry<T> | undefined;
	if (entry) {
		const age = now - entry.fetchedAt;
		// Re-insert to keep the Map in least-recently-used order.
		cache.delete(key);
		cache.set(key, entry);
		if (age < FRESH_MS) return entry.value;
		if (age < STALE_MS) {
			if (!entry.refreshing) {
				entry.refreshing = true;
				const next = load();
				next.then(
					() => store(key, next),
					() => (entry.refreshing = false)
				);
			}
			return entry.value;
		}
	}
	const value = load();
	store(key, value);
	value.catch(() => {
		if (cache.get(key)?.value === value) cache.delete(key);
	});
	return value;
}

function store<T>(key: string, value: Promise<T>) {
	cache.delete(key);
	cache.set(key, { value, fetchedAt: Date.now(), refreshing: false });
	while (cache.size > MAX_ENTRIES) {
		cache.delete(cache.keys().next().value!);
	}
}

// A simple semaphore so a page that needs many records (e.g. every move a Pokémon
// learns) doesn't open hundreds of sockets at once.
let active = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
	if (active >= MAX_CONCURRENT_REQUESTS) await new Promise<void>((r) => queue.push(r));
	active++;
	try {
		return await fn();
	} finally {
		active--;
		queue.shift()?.();
	}
}

/** Converts a resource path (`pokemon/25`) or absolute API URL into a request URL. */
function apiUrl(pathOrUrl: string): string {
	const path = pathOrUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\/?(api\/v2\/)?/, '');
	return `${API_BASE_URL}/api/v2/${path}`;
}

/** Fetches a JSON resource. Resolves to `null` for 404s and throws on other errors. */
export async function fetchJson<T>(pathOrUrl: string): Promise<T | null> {
	const url = apiUrl(pathOrUrl);
	return withSlot(async () => {
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (res.status === 404) {
			await res.body?.cancel();
			return null;
		}
		if (!res.ok) {
			await res.body?.cancel();
			throw new Error(`PokeAPI request failed: ${res.status} ${url}`);
		}
		return (await res.json()) as T;
	});
}

/** Builds an absolute URL for a file under the API server's /media/ directory. */
export function mediaUrl(path: string): string {
	return `${API_BASE_URL}/media/${path}`;
}
