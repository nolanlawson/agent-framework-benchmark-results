// Thin client for the PokeAPI server. Responses are cached in memory for the lifetime of
// the page; nothing is fetched or embedded at build time.

declare global {
  interface Window {
    API_BASE_URL?: string;
  }
}

export const API_BASE_URL = (window.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

export class NotFoundError extends Error {}

export interface NamedRef {
  name: string;
  url: string;
}

export interface Name {
  name: string;
  language: NamedRef;
}

export interface FlavorText {
  flavor_text: string;
  language: NamedRef;
}

export interface EffectEntry {
  effect: string;
  short_effect: string;
  language: NamedRef;
}

export interface ListResponse {
  count: number;
  results: NamedRef[];
}

export interface Species {
  id: number;
  name: string;
  names: Name[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: FlavorText[];
  generation: NamedRef;
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface VersionGroupDetail {
  level_learned_at: number;
  version_group: NamedRef;
  move_learn_method: NamedRef;
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  moves: { move: NamedRef; version_group_details: VersionGroupDetail[] }[];
  species: NamedRef;
  sprites: { front_default: string | null; other?: { 'official-artwork'?: { front_default: string | null } } };
  stats: { base_stat: number; stat: NamedRef }[];
  types: { slot: number; type: NamedRef }[];
}

export interface Move {
  id: number;
  name: string;
  names: Name[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  effect_chance: number | null;
  damage_class: NamedRef | null;
  type: NamedRef;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: NamedRef[];
}

export interface Ability {
  id: number;
  name: string;
  names: Name[];
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface Type {
  id: number;
  name: string;
  names: Name[];
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
  names: Name[];
  pokemon_species: NamedRef[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}

export interface ChainLink {
  species: NamedRef;
  evolves_to: ChainLink[];
}

export interface EvolutionChain {
  id: number;
  chain: ChainLink;
}

const cache = new Map<string, Promise<unknown>>();

/** Fetches an API path (`pokemon/25`) or absolute API URL as JSON. */
export function get<T>(pathOrUrl: string): Promise<T> {
  const url = /^https?:/.test(pathOrUrl) ? pathOrUrl : `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
  let promise = cache.get(url) as Promise<T> | undefined;
  if (!promise) {
    promise = fetch(url).then((res) => {
      if (res.status === 404) throw new NotFoundError(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      return res.json() as Promise<T>;
    });
    promise.catch(() => cache.delete(url));
    cache.set(url, promise);
  }
  return promise;
}

/** Every entry of a list endpoint. */
export const getAll = (resource: string) => get<ListResponse>(`${resource}/?limit=100000`).then((list) => list.results);

export const getSpecies = (name: string) => get<Species>(`pokemon-species/${encodeURIComponent(name)}`);
export const getPokemon = (idOrName: string | number) => get<Pokemon>(`pokemon/${idOrName}`);
export const getMove = (name: string) => get<Move>(`move/${encodeURIComponent(name)}`);
export const getAbility = (name: string) => get<Ability>(`ability/${encodeURIComponent(name)}`);
export const getType = (name: string) => get<Type>(`type/${encodeURIComponent(name)}`);
export const getVersionGroup = (name: string) => get<VersionGroup>(`version-group/${encodeURIComponent(name)}`);

/** ID at the end of a resource URL (`.../pokemon/25/` → 25). */
export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

/** Types shown in the app: everything except these. */
const HIDDEN_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export async function getMainTypes(): Promise<Type[]> {
  const refs = (await getAll('type')).filter((t) => !HIDDEN_TYPES.has(t.name));
  return Promise.all(refs.map((t) => getType(t.name)));
}

export async function getGenerations(): Promise<Generation[]> {
  const refs = await getAll('generation');
  return Promise.all(refs.map((g) => get<Generation>(g.url)));
}

/** Species ID → species name, for every species. */
export async function getSpeciesNames(): Promise<Map<number, string>> {
  const list = await getAll('pokemon-species');
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

/** English type names by API name, for the 18 types. Falls back to the humanized name. */
export async function getTypeNames(): Promise<Map<string, string>> {
  const types = await getMainTypes();
  return new Map(types.map((t) => [t.name, englishName(t)]));
}

// ---- Text helpers ----

const isEnglish = (entry: { language: NamedRef }) => entry.language.name === 'en';

export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function englishName(resource: { name: string; names: Name[] }): string {
  return resource.names.find(isEnglish)?.name ?? humanize(resource.name);
}

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();

export function latestFlavorText(entries: FlavorText[]): string | undefined {
  const english = entries.filter(isEnglish);
  const last = english[english.length - 1];
  return last ? collapse(last.flavor_text) : undefined;
}

export function shortEffect(resource: { effect_entries: EffectEntry[]; effect_chance?: number | null }): string | undefined {
  const entry = resource.effect_entries.find(isEnglish);
  if (!entry) return undefined;
  const text = collapse(entry.short_effect);
  return resource.effect_chance == null ? text : text.replaceAll('$effect_chance', String(resource.effect_chance));
}

export function englishGenus(species: Species): string | undefined {
  return species.genera.find(isEnglish)?.genus;
}
