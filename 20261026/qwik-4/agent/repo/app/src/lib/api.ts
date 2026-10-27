// Server-side PokeAPI client. Only used from route loaders, so it never ships to the browser.
//
// Every response is fetched at request time and kept in memory for a short while: the API is
// treated as a live service, so cached entries expire and get refetched.

import { humanize, type CardData, type TypeRef } from "./format";

const CACHE_TTL_MS = 60_000;
const MAX_CONCURRENT = 24;
const HIDDEN_TYPES = new Set(["stellar", "unknown", "shadow"]);
/** Pokémon IDs above this are alternate forms, which are out of scope. */
const MAX_DEFAULT_ID = 10_000;

export const apiBase = () =>
  (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");

export interface NamedRef {
  name: string;
  url: string;
}

interface Named {
  name: string;
  language: NamedRef;
}

// ---------------------------------------------------------------------------
// Fetching

let active = 0;
const queue: (() => void)[] = [];

async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

/** Turns `pokemon/25`, `/api/v2/pokemon/25/` or an absolute API URL into a request URL. */
function resolveUrl(path: string): string {
  const match = path.match(/\/api\/v2\/(.*)$/);
  const rel = (match ? match[1] : path).replace(/^\/+/, "");
  return `${apiBase()}/api/v2/${rel}`;
}

/** GETs an API resource. Resolves to `null` when the API says it doesn't exist. */
export function api<T = any>(path: string): Promise<T | null> {
  const url = resolveUrl(path);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as Promise<T | null>;

  const value = limited(async () => {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
    return (await res.json()) as T;
  });
  cache.set(url, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => cache.delete(url));
  return value;
}

/** Like `api`, but for resources that must exist. */
async function apiRequired<T = any>(path: string): Promise<T> {
  const data = await api<T>(path);
  if (data === null) throw new Error(`API resource missing: ${path}`);
  return data;
}

const listAll = async (resource: string): Promise<NamedRef[]> =>
  (await apiRequired<{ results: NamedRef[] }>(`${resource}/?limit=100000&offset=0`)).results;

// ---------------------------------------------------------------------------
// Small helpers

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

export const englishName = (names: Named[] | undefined, fallback: string) =>
  names?.find((n) => n.language.name === "en")?.name ?? humanize(fallback);

export const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

export function latestEnglishFlavorText(
  entries: { flavor_text?: string; text?: string; language: NamedRef }[] | undefined,
): string | null {
  const english = (entries ?? []).filter((e) => e.language.name === "en");
  const last = english[english.length - 1];
  const text = last?.flavor_text ?? last?.text;
  return text ? cleanText(text) : null;
}

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`;

// ---------------------------------------------------------------------------
// Species and types

/** Species ID → species API name, for every species the API lists. */
export async function getSpeciesNames(): Promise<Map<number, string>> {
  const list = await listAll("pokemon-species");
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

/** The 18 types, in API order. */
export async function getTypeList(): Promise<NamedRef[]> {
  return (await listAll("type")).filter((t) => !HIDDEN_TYPES.has(t.name));
}

/** Type API name → English name, for the 18 types. */
export async function getTypeLabels(): Promise<Map<string, string>> {
  const types = await getTypeList();
  const docs = await Promise.all(types.map((t) => api(`type/${t.name}`)));
  return new Map(types.map((t, i) => [t.name, englishName(docs[i]?.names, t.name)]));
}

export const typeRef = (labels: Map<string, string>, name: string): TypeRef => ({
  name,
  label: labels.get(name) ?? humanize(name),
});

/**
 * Turns references to Pokémon (as used by types, moves and abilities) into species cards:
 * alternate forms are dropped, each card shows and links to its species, ordered by dex number.
 */
export async function speciesCards<T extends { pokemon: NamedRef }>(
  entries: T[],
  extra?: (entry: T) => Partial<CardData>,
): Promise<CardData[]> {
  const species = await getSpeciesNames();
  const byId = new Map<number, CardData>();
  for (const entry of entries) {
    const id = idFromUrl(entry.pokemon.url);
    if (!(id <= MAX_DEFAULT_ID) || byId.has(id)) continue;
    byId.set(id, {
      id,
      name: species.get(id) ?? entry.pokemon.name,
      sprite: spriteUrl(id),
      ...extra?.(entry),
    });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Home page index

export interface IndexEntry extends CardData {
  label: string;
  types: TypeRef[];
  generation: string;
}

export interface Generation {
  name: string;
  label: string;
}

export async function getGenerations(): Promise<{ list: Generation[]; species: Map<string, string> }> {
  const refs = await listAll("generation");
  const docs = await Promise.all(refs.map((g) => apiRequired(`generation/${g.name}`)));
  const species = new Map<string, string>();
  const list = docs
    .map((doc, i) => ({ doc, ref: refs[i] }))
    .sort((a, b) => a.doc.id - b.doc.id)
    .map(({ doc, ref }) => {
      for (const s of doc.pokemon_species as NamedRef[]) species.set(s.name, ref.name);
      return { name: ref.name, label: englishName(doc.names, ref.name) };
    });
  return { list, species };
}

/** Every species with its default Pokémon's types and its generation. */
export async function getSpeciesIndex(): Promise<{
  entries: IndexEntry[];
  types: TypeRef[];
  generations: Generation[];
}> {
  const [speciesNames, typeList, typeLabels, generations] = await Promise.all([
    getSpeciesNames(),
    getTypeList(),
    getTypeLabels(),
    getGenerations(),
  ]);
  const typeDocs = await Promise.all(typeList.map((t) => apiRequired(`type/${t.name}`)));

  // Species ID → [slot, type] pairs from the type documents.
  const slots = new Map<number, [number, string][]>();
  typeDocs.forEach((doc, i) => {
    for (const p of doc.pokemon as { slot: number; pokemon: NamedRef }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!(id <= MAX_DEFAULT_ID)) continue;
      const list = slots.get(id) ?? [];
      list.push([p.slot, typeList[i].name]);
      slots.set(id, list);
    }
  });

  const entries = [...speciesNames.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      sprite: spriteUrl(id),
      types: (slots.get(id) ?? []).sort((a, b) => a[0] - b[0]).map(([, t]) => typeRef(typeLabels, t)),
      generation: generations.species.get(name) ?? "",
    }));

  return {
    entries,
    types: typeList.map((t) => typeRef(typeLabels, t.name)),
    generations: generations.list,
  };
}
