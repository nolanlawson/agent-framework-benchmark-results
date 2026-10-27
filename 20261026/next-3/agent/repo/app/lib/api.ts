import "server-only";

// Thin client for the PokeAPI server. Every response is fetched at request time and kept
// in memory for a short while, so repeated renders don't refetch the same records while
// changes on the API still show up quickly.

const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;

type Entry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

export class NotFoundError extends Error {}

export function apiBase(): string {
  return (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/$/, "");
}

async function load(url: string): Promise<unknown> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 404) throw new NotFoundError(url);
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
  return res.json();
}

// `path` is relative to /api/v2/, e.g. "pokemon/25". Absolute URLs from the API also work.
export function get<T>(path: string): Promise<T> {
  const url = /^https?:/.test(path) ? path : `${apiBase()}/api/v2/${path.replace(/^\/+/, "")}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  const value = load(url);
  cache.set(url, { expires: now + TTL_MS, value });
  // Failed requests aren't worth remembering.
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  if (cache.size > MAX_ENTRIES) {
    for (const [key, entry] of cache) {
      if (entry.expires <= now || cache.size > MAX_ENTRIES) cache.delete(key);
      if (cache.size <= MAX_ENTRIES * 0.9) break;
    }
  }
  return value as Promise<T>;
}

// Like get(), but resolves to null for resources the API doesn't have.
export async function find<T>(path: string): Promise<T | null> {
  try {
    return await get<T>(path);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export async function list(resource: string): Promise<NamedRef[]> {
  const data = await get<{ results: NamedRef[] }>(`${resource}/?limit=100000&offset=0`);
  return data.results;
}

// ---- Shapes of the API records we use ----

export type NamedRef = { name: string; url: string };
type Lang = { language: NamedRef };
export type Name = Lang & { name: string };

export type Species = {
  id: number;
  name: string;
  names: Name[];
  genera: (Lang & { genus: string })[];
  flavor_text_entries: (Lang & { flavor_text: string })[];
  evolution_chain: { url: string } | null;
  generation: NamedRef;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
};

export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: NamedRef;
  types: { slot: number; type: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  sprites: {
    front_default: string | null;
    other?: { "official-artwork"?: { front_default: string | null } };
  };
  moves: {
    move: NamedRef;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedRef;
      move_learn_method: NamedRef;
    }[];
  }[];
};

export type ChainLink = { species: NamedRef; evolves_to: ChainLink[] };
export type EvolutionChain = { id: number; chain: ChainLink };

export type Move = {
  id: number;
  name: string;
  names: Name[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  type: NamedRef;
  damage_class: NamedRef | null;
  effect_entries: (Lang & { short_effect: string; effect: string })[];
  flavor_text_entries: (Lang & { flavor_text: string })[];
  learned_by_pokemon: NamedRef[];
};

export type Ability = {
  id: number;
  name: string;
  names: Name[];
  effect_entries: (Lang & { short_effect: string; effect: string })[];
  flavor_text_entries: (Lang & { flavor_text: string })[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
};

export type Type = {
  id: number;
  name: string;
  names: Name[];
  damage_relations: Record<
    | "double_damage_to"
    | "half_damage_to"
    | "no_damage_to"
    | "double_damage_from"
    | "half_damage_from"
    | "no_damage_from",
    NamedRef[]
  >;
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
};

export type Generation = {
  id: number;
  name: string;
  names: Name[];
  pokemon_species: NamedRef[];
};

export type VersionGroup = { id: number; name: string; order: number };
