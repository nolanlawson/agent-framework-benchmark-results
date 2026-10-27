import 'server-only';
import { connection } from 'next/server';

// The API is treated as a live service: every response is fetched at request time and kept
// in memory only briefly, so changes to the data show up within CACHE_TTL_MS.
const CACHE_TTL_MS = 60_000;

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

export interface NamedRef {
  name: string;
  url: string;
}
export interface LocalizedName {
  name: string;
  language: NamedRef;
}
interface FlavorText {
  flavor_text: string;
  language: NamedRef;
}
interface EffectEntry {
  short_effect: string;
  language: NamedRef;
}

export interface Species {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: FlavorText[];
  evolution_chain: { url: string } | null;
  generation: NamedRef;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface PokemonMoveEntry {
  move: NamedRef;
  version_group_details: { level_learned_at: number; version_group: NamedRef; move_learn_method: NamedRef }[];
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  types: { slot: number; type: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  moves: PokemonMoveEntry[];
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null } | undefined> };
}

export interface Move {
  id: number;
  name: string;
  names: LocalizedName[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  damage_class: NamedRef | null;
  type: NamedRef;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: NamedRef[];
}

export interface Ability {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: EffectEntry[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface Type {
  id: number;
  name: string;
  names: LocalizedName[];
  damage_relations: Record<
    'double_damage_to' | 'half_damage_to' | 'no_damage_to' | 'double_damage_from' | 'half_damage_from' | 'no_damage_from',
    NamedRef[]
  >;
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
}

export interface Generation {
  id: number;
  name: string;
  names: LocalizedName[];
  pokemon_species: NamedRef[];
}

interface ChainLink {
  species: NamedRef;
  evolves_to: ChainLink[];
}
export interface EvolutionChain {
  id: number;
  chain: ChainLink;
}
export type { ChainLink };

interface VersionGroup {
  name: string;
  order: number;
}

interface ListResponse {
  count: number;
  results: NamedRef[];
}

type Entry = { at: number; value: Promise<unknown> };
const cache = new Map<string, Entry>();

function sweep(now: number) {
  for (const [key, entry] of cache) if (now - entry.at > CACHE_TTL_MS) cache.delete(key);
}

// Memoizes an async computation for CACHE_TTL_MS. Failures are not cached.
function cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at <= CACHE_TTL_MS) return hit.value as Promise<T>;
  if (cache.size > 2000) sweep(now);
  const value = compute();
  const entry = { at: now, value };
  cache.set(key, entry);
  value.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return value;
}

class NotFoundError extends Error {}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/api/v2/${path}`, { cache: 'no-store' });
  if (res.status === 404) throw new NotFoundError(path);
  if (!res.ok) throw new Error(`API request failed: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

// Fetches an API path; resolves to null when the API answers 404.
export async function api<T>(path: string): Promise<T | null> {
  await connection();
  try {
    return await cached(`api:${path}`, () => fetchJson<T>(path));
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

async function apiOrThrow<T>(path: string): Promise<T> {
  const value = await api<T>(path);
  if (value === null) throw new Error(`API resource missing: ${path}`);
  return value;
}

const isValidName = (name: string) => /^[a-z0-9-]+$/i.test(name);

export const getSpecies = (name: string) => (isValidName(name) ? api<Species>(`pokemon-species/${name.toLowerCase()}/`) : null);
export const getPokemon = (id: number | string) => api<Pokemon>(`pokemon/${id}/`);
export const getMove = (name: string) => (isValidName(name) ? api<Move>(`move/${name.toLowerCase()}/`) : null);
export const getAbility = (name: string) => (isValidName(name) ? api<Ability>(`ability/${name.toLowerCase()}/`) : null);
export const getEvolutionChain = (url: string) => api<EvolutionChain>(`evolution-chain/${idFromUrl(url)}/`);

export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : NaN;
}

export function englishName(names: LocalizedName[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? fallback;
}

export function latestEnglishFlavorText(entries: FlavorText[] | undefined): string | null {
  const english = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = english[english.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function englishShortEffect(entries: EffectEntry[] | undefined): string | null {
  const text = entries?.find((e) => e.language.name === 'en')?.short_effect;
  return text ? text.replace(/\s+/g, ' ').trim() : null;
}

export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// All species, ordered by dex number.
export function getSpeciesList(): Promise<{ id: number; name: string }[]> {
  return cached('speciesList', async () => {
    const list = await apiOrThrow<ListResponse>('pokemon-species/?limit=100000');
    return list.results
      .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
      .filter((s) => Number.isFinite(s.id))
      .sort((a, b) => a.id - b.id);
  });
}

// The 18 types, full records, in API order.
export function getTypes(): Promise<Type[]> {
  return cached('types', async () => {
    const list = await apiOrThrow<ListResponse>('type/?limit=1000');
    const names = list.results.filter((r) => !EXCLUDED_TYPES.has(r.name)).map((r) => r.name);
    return Promise.all(names.map((name) => apiOrThrow<Type>(`type/${name}/`)));
  });
}

export async function getType(name: string): Promise<Type | null> {
  if (EXCLUDED_TYPES.has(name.toLowerCase())) return null;
  return (await getTypes()).find((t) => t.name === name.toLowerCase()) ?? null;
}

// Type API name -> English name.
export async function getTypeNames(): Promise<Record<string, string>> {
  const types = await getTypes();
  return Object.fromEntries(types.map((t) => [t.name, englishName(t.names, t.name)]));
}

export function getGenerations(): Promise<Generation[]> {
  return cached('generations', async () => {
    const list = await apiOrThrow<ListResponse>('generation/?limit=1000');
    const generations = await Promise.all(list.results.map((r) => apiOrThrow<Generation>(`generation/${r.name}/`)));
    return generations.sort((a, b) => a.id - b.id);
  });
}

export function getVersionGroupOrder(): Promise<Record<string, number>> {
  return cached('versionGroups', async () => {
    const list = await apiOrThrow<ListResponse>('version-group/?limit=1000');
    const groups = await Promise.all(list.results.map((r) => apiOrThrow<VersionGroup>(`version-group/${r.name}/`)));
    return Object.fromEntries(groups.map((g) => [g.name, g.order]));
  });
}

export interface IndexEntry {
  id: number;
  name: string;
  types: string[];
  generation: string | null;
}

// Every species with its default Pokémon's types and its generation, for the home page.
export function getPokemonIndex(): Promise<IndexEntry[]> {
  return cached('pokemonIndex', async () => {
    const [species, types, generations] = await Promise.all([getSpeciesList(), getTypes(), getGenerations()]);
    const typesById = new Map<number, { slot: number; type: string }[]>();
    for (const type of types) {
      for (const { slot, pokemon } of type.pokemon) {
        const id = idFromUrl(pokemon.url);
        if (!typesById.has(id)) typesById.set(id, []);
        typesById.get(id)!.push({ slot, type: type.name });
      }
    }
    const generationBySpecies = new Map<string, string>();
    for (const generation of generations) {
      for (const s of generation.pokemon_species) generationBySpecies.set(s.name, generation.name);
    }
    return species.map((s) => ({
      id: s.id,
      name: s.name,
      types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
      generation: generationBySpecies.get(s.name) ?? null,
    }));
  });
}

export interface CardData {
  id: number;
  name: string;
  hidden?: boolean;
}

// Maps Pokémon references to their species, dropping alternate forms, ordered by dex number.
export async function toCards(refs: { pokemon: NamedRef; hidden?: boolean }[]): Promise<CardData[]> {
  const species = await getSpeciesList();
  const nameById = new Map(species.map((s) => [s.id, s.name]));
  const seen = new Map<number, CardData>();
  for (const { pokemon, hidden } of refs) {
    const id = idFromUrl(pokemon.url);
    const name = nameById.get(id);
    if (!name || id > 10000 || seen.has(id)) continue;
    seen.set(id, hidden === undefined ? { id, name } : { id, name, hidden });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

export interface MoveSummary {
  name: string;
  displayName: string;
  type: string;
  damageClass: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export async function getMoveSummary(name: string): Promise<MoveSummary | null> {
  const move = await getMove(name);
  if (!move) return null;
  return {
    name: move.name,
    displayName: englishName(move.names, move.name),
    type: move.type.name,
    damageClass: move.damage_class?.name ?? null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
  };
}

// Runs fn over items with at most `limit` in flight.
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
