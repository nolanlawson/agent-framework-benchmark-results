// Thin client for the PokeAPI server. Responses are cached in memory for the
// lifetime of the page, so client-side navigation doesn't refetch.

const meta = document.querySelector<HTMLMetaElement>('meta[name="api-base-url"]');
const configured = meta?.content && !meta.content.startsWith('__') ? meta.content : 'http://localhost:9000';
export const API_BASE_URL = configured.replace(/\/$/, '');

export class NotFoundError extends Error {
  constructor(url: string) {
    super(`Not found: ${url}`);
    this.name = 'NotFoundError';
  }
}

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
export interface ResourceList {
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

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedRef }[];
  abilities: { slot: number; is_hidden: boolean; ability: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  sprites: {
    front_default: string | null;
    other?: { 'official-artwork'?: { front_default: string | null } };
  };
  moves: {
    move: NamedRef;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedRef;
      move_learn_method: NamedRef;
    }[];
  }[];
}

export interface EvolutionLink {
  species: NamedRef;
  evolves_to: EvolutionLink[];
}
export interface EvolutionChain {
  id: number;
  chain: EvolutionLink;
}

export interface Move {
  id: number;
  name: string;
  names: Name[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  type: NamedRef;
  damage_class: NamedRef | null;
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

const cache = new Map<string, Promise<unknown>>();

/** Fetches an API path (`pokemon/25`) or absolute API URL, as JSON. */
export function get<T>(pathOrUrl: string): Promise<T> {
  const url = /^https?:/.test(pathOrUrl)
    ? pathOrUrl
    : `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '').replace(/\/?$/, '/')}`;
  let promise = cache.get(url) as Promise<T> | undefined;
  if (!promise) {
    promise = fetch(url).then((res) => {
      if (res.status === 404) throw new NotFoundError(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
      return res.json() as Promise<T>;
    });
    // Don't keep failures around, so a later visit can retry.
    promise.catch(() => cache.delete(url));
    cache.set(url, promise);
  }
  return promise;
}

/** Every entry of a list endpoint. */
export async function getAll(resource: string): Promise<NamedRef[]> {
  const list = await get<ResourceList>(`${resource}/?limit=100000`);
  return list.results;
}

/** The numeric ID at the end of a resource URL. */
export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

export const spriteUrl = (pokemonId: number) => `${API_BASE_URL}/media/sprites/pokemon/${pokemonId}.png`;

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types, in API order, with their full records. */
export async function getTypes(): Promise<Type[]> {
  const refs = (await getAll('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  return Promise.all(refs.map((t) => get<Type>(t.url)));
}

/** Map of species ID to species name, for every species the API lists. */
export async function getSpeciesNames(): Promise<Map<number, string>> {
  const all = await getAll('pokemon-species');
  return new Map(all.map((s) => [idFromUrl(s.url), s.name]));
}

/** Map of type name to English type name. */
export async function getTypeNames(): Promise<Map<string, string>> {
  const types = await getTypes();
  return new Map(types.map((t) => [t.name, englishName(t)]));
}

export function englishName(resource: { name: string; names?: Name[] }): string {
  return resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);
}

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Last English flavor text with whitespace collapsed, or undefined. */
export function latestFlavorText(entries: FlavorText[] | undefined): string | undefined {
  const english = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = english.at(-1);
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : undefined;
}

export function englishShortEffect(entries: EffectEntry[] | undefined): string | undefined {
  const text = entries?.find((e) => e.language.name === 'en')?.short_effect;
  return text ? text.replace(/\s+/g, ' ').trim() : undefined;
}

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

/** Alternate forms (IDs above 10000) are out of scope everywhere. */
export const isDefaultForm = (pokemonId: number) => pokemonId > 0 && pokemonId < 10000;
