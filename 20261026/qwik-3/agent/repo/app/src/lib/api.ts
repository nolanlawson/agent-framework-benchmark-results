import { humanize, idFromUrl, englishName, type NamedRef } from "./format";

/* Server-only helpers for talking to the PokeAPI server. Responses are cached in memory
   for a short time; the API is treated as a live service, so nothing is cached for long. */

const TTL_MS = 60_000;
const MAX_ENTRIES = 5000;

export const apiBase = () => (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");

const cache = new Map<string, { expires: number; value: Promise<any> }>();

/** Fetches `/api/v2/<path>`; resolves to null on 404. */
export function api<T = any>(path: string): Promise<T | null> {
  const key = path.replace(/^\/+/, "");
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value;

  const value = (async () => {
    const res = await fetch(`${apiBase()}/api/v2/${key}`);
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) throw new Error(`API ${key} responded ${res.status}`);
    return res.json();
  })();
  value.catch(() => cache.delete(key));
  if (cache.size >= MAX_ENTRIES) {
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
    if (cache.size >= MAX_ENTRIES) cache.clear();
  }
  cache.set(key, { expires: now + TTL_MS, value });
  return value;
}

/** Turns an absolute API URL from a response into a path for `api()`. */
export const apiPath = (url: string) => url.replace(/^.*?\/api\/v2\//, "");

export async function apiOrThrow<T = any>(path: string): Promise<T> {
  const data = await api<T>(path);
  if (!data) throw new Error(`API ${path} not found`);
  return data;
}

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`;

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export interface TypeInfo {
  name: string;
  label: string;
}

export interface CardData {
  id: number;
  name: string;
  sprite: string;
  types?: TypeInfo[];
  hidden?: boolean;
}

/** Every type the API lists, in API order, with English names. */
export async function allTypes() {
  const list = await apiOrThrow<{ results: NamedRef[] }>("type/?limit=1000");
  return Promise.all(
    list.results.map(async (ref) => {
      const type = await api(`type/${ref.name}`);
      return { name: ref.name, label: type ? englishName(type) : humanize(ref.name), data: type };
    }),
  );
}

/** The 18 main types in API order. */
export async function mainTypes() {
  return (await allTypes()).filter((t) => !EXCLUDED_TYPES.has(t.name));
}

export async function typeLabels() {
  return new Map((await allTypes()).map((t) => [t.name, t.label]));
}

/** Species id -> species name, for every species the API lists. */
export async function speciesList() {
  const list = await apiOrThrow<{ results: NamedRef[] }>("pokemon-species/?limit=100000");
  return list.results
    .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
    .filter((s) => Number.isFinite(s.id))
    .sort((a, b) => a.id - b.id);
}

export async function speciesById() {
  return new Map((await speciesList()).map((s) => [s.id, s.name]));
}

/** Maps Pokémon references to species cards: drops alternate forms, sorts by dex number. */
export async function cardsForPokemon<T extends { pokemon: NamedRef }>(
  refs: T[],
  extra?: (ref: T) => Partial<CardData>,
): Promise<CardData[]> {
  const species = await speciesById();
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (!(id > 0 && id < 10000) || seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, name: species.get(id) ?? ref.pokemon.name, sprite: spriteUrl(id), ...extra?.(ref) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

export interface IndexEntry {
  id: number;
  name: string;
  label: string;
  types: string[];
  generation?: string;
}

/** Everything the Pokémon list page filters on: species with their types and generation. */
export async function speciesIndex() {
  const [species, types, generationList] = await Promise.all([
    speciesList(),
    mainTypes(),
    apiOrThrow<{ results: NamedRef[] }>("generation/?limit=1000"),
  ]);
  const generations = await Promise.all(
    generationList.results.map(async (ref) => {
      const gen = await apiOrThrow(`generation/${ref.name}`);
      return { name: ref.name, label: englishName(gen), data: gen };
    }),
  );

  const typesById = new Map<number, string[]>();
  for (const type of types) {
    for (const entry of type.data?.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url);
      const slots = typesById.get(id) ?? [];
      slots[entry.slot - 1] = type.name;
      typesById.set(id, slots);
    }
  }
  const generationById = new Map<number, string>();
  for (const gen of generations) {
    for (const ref of gen.data.pokemon_species ?? []) generationById.set(idFromUrl(ref.url), gen.name);
  }

  const entries: IndexEntry[] = species.map((s) => ({
    id: s.id,
    name: s.name,
    label: humanize(s.name),
    types: (typesById.get(s.id) ?? []).filter(Boolean),
    generation: generationById.get(s.id),
  }));

  return {
    entries,
    types: types.map(({ name, label }) => ({ name, label })),
    typeLabels: new Map(types.map((t) => [t.name, t.label])),
    generations: generations.map(({ name, label }) => ({ name, label })),
  };
}
