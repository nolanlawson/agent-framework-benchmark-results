// Server-side access to the PokeAPI server, with a short-lived in-memory cache.
// Data is always fetched at request time; nothing is read or embedded at build time.

const CACHE_TTL_MS = 60_000;
const MAX_CONCURRENT = 24;

interface CacheEntry {
	expires: number;
	value: Promise<unknown>;
}

const cache = new Map<string, CacheEntry>();

export function apiBase(): string {
	return (process.env['API_BASE_URL'] ?? 'http://localhost:9000').replace(/\/$/, '');
}

export class ApiError extends Error {}

/** True while `vite build` renders route shells; see vite.config.ts. */
export function isBuildStep(): boolean {
	return process.env['POKEDEX_BUILD_STEP'] === '1';
}

// A tiny semaphore so a page that needs many records doesn't open hundreds of sockets.
let active = 0;
const queue: (() => void)[] = [];
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
		const response = await fetch(url);
		if (response.status === 404) {
			await response.body?.cancel();
			return null;
		}
		if (!response.ok) throw new ApiError(`${url} responded with ${response.status}`);
		return response.json();
	});
}

/**
 * GETs `path` (relative to `/api/v2/`, or an absolute API URL). Resolves to `null` when
 * the resource doesn't exist.
 */
export function getJson<T>(path: string): Promise<T | null> {
	if (isBuildStep()) return Promise.reject(new ApiError('The API is not available at build time'));
	const url = /^https?:/.test(path) ? path : `${apiBase()}/api/v2/${path.replace(/^\//, '')}`;
	const now = Date.now();
	const hit = cache.get(url);
	if (hit && hit.expires > now) return hit.value as Promise<T | null>;

	const value = load(url);
	cache.set(url, { expires: now + CACHE_TTL_MS, value });
	// Don't keep failures around.
	value.catch(() => {
		if (cache.get(url)?.value === value) cache.delete(url);
	});
	if (cache.size > 5000) {
		for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
	}
	return value as Promise<T | null>;
}

/** Like `getJson`, but throws when the resource is missing. */
export async function mustGetJson<T>(path: string): Promise<T> {
	const data = await getJson<T>(path);
	if (data === null) throw new ApiError(`${path} not found`);
	return data;
}

/** Looks a resource up by name. Names are restricted to API-style slugs. */
export function getByName<T>(resource: string, name: string | undefined): Promise<T | null> {
	if (!name || !/^[a-z0-9-]+$/i.test(name) || !/[a-z]/i.test(name)) return Promise.resolve(null);
	return getJson<T>(`${resource}/${name.toLowerCase()}/`);
}
