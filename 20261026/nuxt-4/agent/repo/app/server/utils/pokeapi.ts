// Thin client for the PokeAPI server. Everything is fetched over HTTP at request time;
// responses are cached in memory for a short while so a page that needs many records
// (a Pokémon's moves, every type) doesn't refetch them on every request.

const TTL_MS = 60_000;
const cache = new Map<string, { expires: number; value: Promise<any> }>();

export function apiBase(): string {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');
}

export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

/** Fetch `/api/v2/<path>`; resolves to null on 404. */
export function pokeapi<T = any>(path: string): Promise<T | null> {
  const key = path.replace(/^\/+|\/+$/g, '');
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value;

  const value = (async () => {
    const [pathname, query] = key.split('?');
    const res = await fetch(`${apiBase()}/api/v2/${pathname}/${query ? `?${query}` : ''}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`PokeAPI ${key}: HTTP ${res.status}`);
    return res.json();
  })();
  cache.set(key, { expires: now + TTL_MS, value });
  value.catch(() => cache.delete(key));
  if (cache.size > 5000) {
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
  }
  return value;
}

export async function pokeapiOr404<T = any>(path: string): Promise<T> {
  const data = await pokeapi<T>(path);
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not found' });
  return data;
}

export async function listAll(resource: string): Promise<{ name: string; url: string }[]> {
  const data = await pokeapi(`${resource}?limit=100000`);
  return data?.results ?? [];
}

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

type Named = { name: string; language: { name: string } };

export function englishName(resource: { name: string; names?: Named[] }): string {
  return resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);
}

export function latestFlavorText(entries: { flavor_text?: string; text?: string; language: { name: string } }[] = []) {
  const en = entries.filter((e) => e.language.name === 'en');
  const last = en[en.length - 1];
  const text = last?.flavor_text ?? last?.text;
  return text ? text.replace(/\s+/g, ' ').trim() : null;
}

export function englishShortEffect(entries: { short_effect?: string; language: { name: string } }[] = []) {
  const text = entries.find((e) => e.language.name === 'en')?.short_effect;
  return text ? text.replace(/\s+/g, ' ').trim() : null;
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export interface TypeInfo {
  name: string;
  label: string;
}

/** The 18 types in API order with their English names. */
export async function allTypes(): Promise<TypeInfo[]> {
  const list = (await listAll('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await Promise.all(list.map((t) => pokeapi(`type/${t.name}`)));
  return records.filter(Boolean).map((t: any) => ({ name: t.name, label: englishName(t) }));
}

/** English names for every type (including the excluded ones), keyed by API name. */
export async function typeLabels(): Promise<Record<string, string>> {
  const list = await listAll('type');
  const records = await Promise.all(list.map((t) => pokeapi(`type/${t.name}`)));
  const labels: Record<string, string> = {};
  for (const t of records) if (t) labels[t.name] = englishName(t);
  return labels;
}

export interface Card {
  id: number;
  name: string;
  sprite: string;
}

/** Map of species id -> species name. */
export async function speciesNames(): Promise<Map<number, string>> {
  const list = await listAll('pokemon-species');
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

/**
 * Turns Pokémon references into species cards: alternate forms (IDs above 10000) are left
 * out, and each default Pokémon maps to the species with the same ID.
 */
export async function cardsFor<T extends { name: string; url: string }>(
  refs: T[],
  extra?: (ref: T) => Record<string, unknown>,
): Promise<(Card & Record<string, unknown>)[]> {
  const species = await speciesNames();
  const seen = new Set<number>();
  const cards: (Card & Record<string, unknown>)[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!id || id > 10000 || seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, name: species.get(id) ?? ref.name, sprite: spriteUrl(id), ...(extra?.(ref) ?? {}) });
  }
  return cards.sort((a, b) => a.id - b.id);
}
