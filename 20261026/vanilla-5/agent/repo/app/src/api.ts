import { idFromUrl, englishName } from './format';

declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

export const API_BASE_URL = (window.__API_BASE_URL__ ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9000').replace(
  /\/+$/,
  '',
);

export interface Named {
  name: string;
  url: string;
}
interface Name {
  name: string;
  language: Named;
}
interface FlavorText {
  flavor_text: string;
  language: Named;
}
interface Effect {
  effect: string;
  short_effect: string;
  language: Named;
}
interface List {
  count: number;
  results: Named[];
}

export interface Species {
  id: number;
  name: string;
  names: Name[];
  genera: { genus: string; language: Named }[];
  flavor_text_entries: FlavorText[];
  evolution_chain: { url: string } | null;
  generation: Named;
  varieties: { is_default: boolean; pokemon: Named }[];
}

export interface PokemonMove {
  move: Named;
  version_group_details: { level_learned_at: number; version_group: Named; move_learn_method: Named }[];
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: { is_hidden: boolean; slot: number; ability: Named }[];
  moves: PokemonMove[];
  stats: { base_stat: number; stat: Named }[];
  types: { slot: number; type: Named }[];
  sprites: { front_default: string | null; other?: { 'official-artwork'?: { front_default: string | null } } };
}

export interface Move {
  id: number;
  name: string;
  names: Name[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  effect_chance: number | null;
  damage_class: Named | null;
  type: Named;
  effect_entries: Effect[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: Named[];
}

export interface Ability {
  id: number;
  name: string;
  names: Name[];
  effect_entries: Effect[];
  flavor_text_entries: FlavorText[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: Named }[];
}

export interface Type {
  id: number;
  name: string;
  names: Name[];
  damage_relations: Record<
    'double_damage_to' | 'half_damage_to' | 'no_damage_to' | 'double_damage_from' | 'half_damage_from' | 'no_damage_from',
    Named[]
  >;
  pokemon: { slot: number; pokemon: Named }[];
  moves: Named[];
}

export interface Generation {
  id: number;
  name: string;
  names: Name[];
  pokemon_species: Named[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}

export interface EvolutionLink {
  species: Named;
  evolves_to: EvolutionLink[];
}
export interface EvolutionChain {
  id: number;
  chain: EvolutionLink;
}

export class NotFoundError extends Error {}

// In-memory cache of in-flight and settled requests, keyed by URL. Failed requests are evicted.
const cache = new Map<string, Promise<unknown>>();

export function get<T>(pathOrUrl: string): Promise<T> {
  const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : `${API_BASE_URL}/api/v2/${pathOrUrl}`;
  let request = cache.get(url) as Promise<T> | undefined;
  if (!request) {
    request = fetch(url).then((res) => {
      if (res.status === 404) throw new NotFoundError(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return res.json() as Promise<T>;
    });
    request.catch(() => cache.delete(url));
    cache.set(url, request);
  }
  return request;
}

export const getResource = <T>(resource: string, name: string): Promise<T> =>
  get<T>(`${resource}/${encodeURIComponent(name.toLowerCase())}/`);

const getAll = (resource: string) => get<List>(`${resource}/?limit=100000`);

export const spriteUrl = (pokemonId: number): string => `${API_BASE_URL}/media/sprites/pokemon/${pokemonId}.png`;

/** Alternate forms (Pokémon IDs above 10000) are out of scope everywhere. */
export const MAX_SPECIES_ID = 10000;

export interface SpeciesRef {
  id: number;
  name: string;
}

/** Every species, ordered by dex number. */
export async function speciesList(): Promise<SpeciesRef[]> {
  const list = await getAll('pokemon-species');
  return list.results
    .map((entry) => ({ id: idFromUrl(entry.url), name: entry.name }))
    .filter((s) => s.id > 0 && s.id <= MAX_SPECIES_ID)
    .sort((a, b) => a.id - b.id);
}

export async function speciesById(): Promise<Map<number, SpeciesRef>> {
  return new Map((await speciesList()).map((s) => [s.id, s]));
}

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types, in API order, with full records. */
export async function allTypes(): Promise<Type[]> {
  const list = await getAll('type');
  return Promise.all(list.results.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => get<Type>(t.url)));
}

/** English names of the types, keyed by API name. */
export async function typeNames(): Promise<Map<string, string>> {
  return new Map((await allTypes()).map((t) => [t.name, englishName(t)]));
}

export async function allGenerations(): Promise<Generation[]> {
  const list = await getAll('generation');
  const generations = await Promise.all(list.results.map((g) => get<Generation>(g.url)));
  return generations.sort((a, b) => a.id - b.id);
}
