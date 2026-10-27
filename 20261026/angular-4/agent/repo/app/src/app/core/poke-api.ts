import { Service, inject } from '@angular/core';
import { API_BASE_URL } from './api-base-url';

/** Thrown when the API answers 404, so pages can show "Not found". */
export class ApiNotFoundError extends Error {
  constructor(readonly url: string) {
    super(`Not found: ${url}`);
  }
}

// API responses are cached in memory for a short while. The cache is module-level so that,
// on the server, it is shared by every request rather than rebuilt per render.
const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 2_000;
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (response.status === 404) throw new ApiNotFoundError(url);
  if (!response.ok) throw new Error(`GET ${url} failed with ${response.status}`);
  return response.json();
}

/** Read-only client for the PokeAPI server named by `API_BASE_URL`. */
@Service()
export class PokeApi {
  private readonly baseUrl = inject(API_BASE_URL);

  /** GETs `/api/v2/<path>`, e.g. `get('pokemon-species/pikachu')`. */
  get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}/api/v2/${path}`;
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && hit.expires > now) return hit.value as Promise<T>;

    const value = fetchJson(url);
    cache.delete(url);
    cache.set(url, { expires: now + TTL_MS, value });
    if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    // Never keep failures around.
    value.catch(() => {
      if (cache.get(url)?.value === value) cache.delete(url);
    });
    return value as Promise<T>;
  }

  /** Like `get`, but resolves to `null` when the resource doesn't exist. */
  async find<T>(path: string): Promise<T | null> {
    try {
      return await this.get<T>(path);
    } catch (error) {
      if (error instanceof ApiNotFoundError) return null;
      throw error;
    }
  }

  /** Every entry of a list endpoint, such as `pokemon-species`. */
  list(resource: string) {
    return this.get<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000`).then(
      (page) => page.results,
    );
  }

  /** URL of a file under the API server's `/media/`. */
  media(path: string): string {
    return `${this.baseUrl}/media/${path}`;
  }
}
