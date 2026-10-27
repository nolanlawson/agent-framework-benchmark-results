// Server-side PokeAPI client with a small in-memory cache.
// Data is always fetched at request time; responses are reused for a short while so a
// page that needs hundreds of records (a Pokémon's moves) stays fast.

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONCURRENT = 32;

export const apiBase = () => (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const cache = new Map();

let active = 0;
const queue = [];
async function limited(task) {
  if (active >= MAX_CONCURRENT) await new Promise((resolve) => queue.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    queue.shift()?.();
  }
}

// Accepts a path (`pokemon/25`) or an absolute API URL. Resolves to null on 404.
export function apiGet(pathOrUrl) {
  const [path, query] = String(pathOrUrl)
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/?(api\/v2\/)?/, '')
    .split('?');
  const url = `${apiBase()}/api/v2/${path.replace(/\/?$/, '/')}${query ? `?${query}` : ''}`;

  const hit = cache.get(url);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.promise;

  const promise = limited(async () => {
    const res = await fetch(url);
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
    return res.json();
  });
  cache.set(url, { time: Date.now(), promise });
  promise.catch(() => cache.delete(url));
  return promise;
}

export const apiList = async (resource) => (await apiGet(`${resource}/?limit=100000`))?.results ?? [];

// Path segments come from the URL; reject anything that isn't a plain API name.
export const isApiName = (name) => typeof name === 'string' && /^[a-z0-9-]+$/i.test(name);
