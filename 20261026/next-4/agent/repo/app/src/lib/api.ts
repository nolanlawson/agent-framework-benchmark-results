import 'server-only';
import { connection } from 'next/server';
import { englishName, humanize, idFromUrl, latestEnglishFlavor } from './format';

// All data comes from the PokeAPI server at request time. Responses are kept in memory
// for a short while so that a page touching hundreds of records stays fast, but the API
// is treated as live: entries expire and are fetched again.
const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;

export const apiBase = () => (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

type Entry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

async function load(path: string): Promise<unknown> {
  const res = await fetch(`${apiBase()}/api/v2/${path}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path}: HTTP ${res.status}`);
  return res.json();
}

/** Fetches `/api/v2/<path>`; resolves to null if the API has no such resource. */
export async function api<T>(path: string): Promise<T | null> {
  await connection();
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expires > now) return hit.value as Promise<T | null>;
  if (cache.size >= MAX_ENTRIES) {
    for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
    if (cache.size >= MAX_ENTRIES) cache.clear();
  }
  const value = load(path);
  cache.set(path, { expires: now + TTL_MS, value });
  value.catch(() => cache.delete(path));
  return value as Promise<T | null>;
}

/** Fetches a resource given an absolute API URL as found in responses. */
export function apiUrl<T>(url: string) {
  return api<T>(url.replace(/^.*\/api\/v2\//, ''));
}

async function required<T>(path: string): Promise<T> {
  const value = await api<T>(path);
  if (value === null) throw new Error(`API ${path}: not found`);
  return value;
}

// ---- Raw API shapes (only the fields the app uses) ----

export type Ref = { name: string; url: string };
export type Named = { name: string; language: Ref };
type List = { count: number; results: Ref[] };
type FlavorEntry = { flavor_text: string; language: Ref };

export type Species = {
  id: number;
  name: string;
  names: Named[];
  genera: { genus: string; language: Ref }[];
  flavor_text_entries: FlavorEntry[];
  generation: Ref;
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: Ref }[];
};

export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: { is_hidden: boolean; slot: number; ability: Ref }[];
  stats: { base_stat: number; stat: Ref }[];
  types: { slot: number; type: Ref }[];
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> };
  moves: {
    move: Ref;
    version_group_details: { level_learned_at: number; version_group: Ref; move_learn_method: Ref }[];
  }[];
};

export type Move = {
  id: number;
  name: string;
  names: Named[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  effect_chance: number | null;
  damage_class: Ref | null;
  type: Ref;
  effect_entries: { short_effect: string; language: Ref }[];
  flavor_text_entries: { flavor_text: string; language: Ref }[];
  learned_by_pokemon: Ref[];
};

export type Ability = {
  id: number;
  name: string;
  names: Named[];
  effect_entries: { short_effect: string; language: Ref }[];
  flavor_text_entries: { flavor_text: string; language: Ref }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: Ref }[];
};

type DamageRelations = Record<
  'double_damage_to' | 'half_damage_to' | 'no_damage_to' | 'double_damage_from' | 'half_damage_from' | 'no_damage_from',
  Ref[]
>;

export type Type = {
  id: number;
  name: string;
  names: Named[];
  damage_relations: DamageRelations;
  pokemon: { slot: number; pokemon: Ref }[];
  moves: Ref[];
};

type Generation = { id: number; name: string; names: Named[]; pokemon_species: Ref[] };
type VersionGroup = { name: string; order: number };

export type ChainLink = { species: Ref; evolves_to: ChainLink[] };
type EvolutionChain = { chain: ChainLink };

// ---- Derived data ----

export type SpeciesRef = { id: number; name: string };
export type TypeInfo = { name: string; label: string };

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** Every species the API lists, by ID. */
export async function getSpeciesList(): Promise<Map<number, SpeciesRef>> {
  const list = await required<List>('pokemon-species/?limit=100000');
  const byId = new Map<number, SpeciesRef>();
  for (const { name, url } of list.results) {
    const id = idFromUrl(url);
    byId.set(id, { id, name });
  }
  return byId;
}

/** The 18 types, in API order, with their full records. */
export async function getTypes(): Promise<Type[]> {
  const list = await required<List>('type/?limit=1000');
  const refs = list.results.filter((t) => !EXCLUDED_TYPES.has(t.name));
  return Promise.all(refs.map((t) => required<Type>(`type/${t.name}`)));
}

export async function getTypeLabels(): Promise<Map<string, string>> {
  const all = await getTypes();
  return new Map(all.map((t) => [t.name, englishName(t.names) ?? humanize(t.name)]));
}

export async function getGenerations() {
  const list = await required<List>('generation/?limit=1000');
  const gens = await Promise.all(list.results.map((g) => required<Generation>(`generation/${g.name}`)));
  return gens.sort((a, b) => a.id - b.id);
}

export type IndexEntry = { id: number; name: string; types: string[]; generation: string };

/** The list behind the home page: every species with its default Pokémon's types and its generation. */
export async function getSpeciesIndex() {
  const [species, types, generations] = await Promise.all([getSpeciesList(), getTypes(), getGenerations()]);

  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!species.has(id)) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot, name: type.name });
      typesById.set(id, list);
    }
  }
  const generationById = new Map<number, string>();
  for (const gen of generations) {
    for (const s of gen.pokemon_species) generationById.set(idFromUrl(s.url), gen.name);
  }

  const entries: IndexEntry[] = [...species.values()]
    .sort((a, b) => a.id - b.id)
    .map(({ id, name }) => ({
      id,
      name,
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
      generation: generationById.get(id) ?? '',
    }));

  return {
    entries,
    types: types.map((t) => ({ name: t.name, label: englishName(t.names) ?? humanize(t.name) })),
    generations: generations.map((g) => ({ name: g.name, label: englishName(g.names) ?? humanize(g.name) })),
  };
}

/**
 * Maps Pokémon references (from type, move and ability data) to the species they belong
 * to, leaving out alternate forms. Each result keeps the original reference's data.
 */
export async function toSpeciesRefs<T>(items: T[], pokemonOf: (item: T) => Ref) {
  const species = await getSpeciesList();
  const result: (SpeciesRef & { item: T })[] = [];
  for (const item of items) {
    const id = idFromUrl(pokemonOf(item).url);
    const s = species.get(id);
    if (s) result.push({ ...s, item });
  }
  return result.sort((a, b) => a.id - b.id);
}

export const getSpecies = (name: string) => api<Species>(`pokemon-species/${encodeURIComponent(name)}`);
export const getMove = (name: string) => api<Move>(`move/${encodeURIComponent(name)}`);
export const getAbility = (name: string) => api<Ability>(`ability/${encodeURIComponent(name)}`);

export async function getType(name: string) {
  if (EXCLUDED_TYPES.has(name.toLowerCase())) return null;
  return api<Type>(`type/${encodeURIComponent(name)}`);
}

export async function getDefaultPokemon(species: Species) {
  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  return variety ? apiUrl<Pokemon>(variety.pokemon.url) : null;
}

export async function getEvolutionChain(species: Species) {
  if (!species.evolution_chain) return null;
  const chain = await apiUrl<EvolutionChain>(species.evolution_chain.url);
  return chain?.chain ?? null;
}

export async function getVersionGroupOrders(names: string[]) {
  const groups = await Promise.all(names.map((n) => api<VersionGroup>(`version-group/${n}`)));
  return new Map(names.map((n, i) => [n, groups[i]?.order ?? Number.MAX_SAFE_INTEGER]));
}

export function moveEffect(move: Move) {
  const entry = move.effect_entries.find((e) => e.language.name === 'en');
  if (entry?.short_effect) {
    return entry.short_effect.replace(/\$effect_chance/g, String(move.effect_chance ?? '')).replace(/\s+/g, ' ').trim();
  }
  return latestEnglishFlavor(move.flavor_text_entries) ?? '—';
}
