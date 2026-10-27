// Server-only access to the PokeAPI server, with a small in-memory cache.
//
// Responses are cached for a short time and then revalidated in the background
// (stale-while-revalidate), so pages stay fast without serving old data for long.

const FRESH_MS = 60_000;

type Json = any;
interface Entry {
  time: number;
  value: Promise<Json | null>;
}

const cache = new Map<string, Entry>();

export function apiBase(): string {
  return (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");
}

/** Path below /api/v2/ for a resource path or an absolute API URL. */
function apiPath(pathOrUrl: string): string {
  const match = pathOrUrl.match(/\/api\/v2\/(.*)$/);
  return (match ? match[1] : pathOrUrl).replace(/^\/+/, "").replace(/\/+($|\?)/, "$1");
}

async function load(path: string): Promise<Json | null> {
  const [resource, query] = path.split("?");
  const res = await fetch(`${apiBase()}/api/v2/${resource}/${query ? `?${query}` : ""}`);
  if (res.status === 404) {
    await res.body?.cancel();
    return null;
  }
  if (!res.ok) throw new Error(`PokeAPI ${path}: HTTP ${res.status}`);
  return res.json();
}

/** Fetches `/api/v2/<path>/`. Resolves to null when the API answers 404. */
export function api(pathOrUrl: string): Promise<Json | null> {
  const path = apiPath(pathOrUrl);
  const now = Date.now();
  const hit = cache.get(path);
  if (hit) {
    if (now - hit.time > FRESH_MS) {
      hit.time = now;
      const next = load(path);
      next.then(
        () => cache.set(path, { time: Date.now(), value: next }),
        () => {},
      );
    }
    return hit.value;
  }
  const value = load(path);
  cache.set(path, { time: now, value });
  value.catch(() => cache.delete(path));
  return value;
}

/** Fetches every entry of a list endpoint. */
export async function apiList(resource: string): Promise<{ name: string; url: string }[]> {
  const list = await api(`${resource}?limit=100000`);
  return list?.results ?? [];
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

export function english<T extends { language: { name: string } }>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language.name === "en");
}

export function englishName(resource: { name: string; names?: { name: string; language: { name: string } }[] }): string {
  return english(resource.names)?.name ?? resource.name;
}

/** The last English flavor text, whitespace collapsed. */
export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === "en");
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, " ").trim() : null;
}
