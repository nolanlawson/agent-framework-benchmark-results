// Thin client for the PokeAPI server. Responses are cached in memory for the
// lifetime of the page; nothing is fetched or embedded at build time.

declare global {
  interface Window {
    __API_BASE_URL__?: string;
  }
}

export const API_BASE_URL = (window.__API_BASE_URL__ || 'http://localhost:9000').replace(/\/$/, '');

export class NotFoundError extends Error {}

export interface NamedRef {
  name: string;
  url: string;
}
interface LocalizedName {
  name: string;
  language: NamedRef;
}
interface FlavorText {
  flavor_text: string;
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

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> };
  moves: {
    move: NamedRef;
    version_group_details: { level_learned_at: number; version_group: NamedRef; move_learn_method: NamedRef }[];
  }[];
}

export interface Move {
  id: number;
  name: string;
  names: LocalizedName[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  type: NamedRef;
  damage_class: NamedRef | null;
  effect_entries: { short_effect: string; language: NamedRef }[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: NamedRef[];
}

export interface Ability {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: { short_effect: string; language: NamedRef }[];
  flavor_text_entries: FlavorText[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface Type {
  id: number;
  name: string;
  names: LocalizedName[];
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
  damage_relations: Record<string, NamedRef[]>;
}

export interface Generation {
  id: number;
  name: string;
  names: LocalizedName[];
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

interface ListResponse {
  count: number;
  results: NamedRef[];
}

const cache = new Map<string, Promise<unknown>>();

/** Fetch an API path (`pokemon/25`) or absolute API URL, cached in memory. */
export function get<T>(pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '').replace(/\/?$/, '/')}`;
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (res.status === 404) throw new NotFoundError(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.json() as Promise<T>;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export async function getList(resource: string): Promise<NamedRef[]> {
  const res = await get<ListResponse>(`${resource}/?limit=100000`);
  return res.results;
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

/** Pokémon IDs above 10000 are alternate forms, which are out of scope. */
export const isAlternateForm = (ref: NamedRef) => idFromUrl(ref.url) > 10000;

// ---------------------------------------------------------------------------
// Text helpers

export const humanize = (name: string) =>
  name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

export const englishName = (r: { name: string; names?: LocalizedName[] }) =>
  r.names?.find((n) => n.language.name === 'en')?.name ?? humanize(r.name);

export function latestFlavorText(entries: FlavorText[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

// ---------------------------------------------------------------------------
// Aggregates

export interface SpeciesSummary {
  id: number;
  name: string;
  label: string;
}

/** Every species, keyed by ID (species ID == default Pokémon ID). */
export async function speciesIndex(): Promise<Map<number, SpeciesSummary>> {
  const list = await getList('pokemon-species');
  const map = new Map<number, SpeciesSummary>();
  for (const r of list) {
    const id = idFromUrl(r.url);
    map.set(id, { id, name: r.name, label: humanize(r.name) });
  }
  return map;
}

/** The 18 types, in API order. */
export async function allTypes(): Promise<Type[]> {
  const list = await getList('type');
  const refs = list.filter((t) => !['stellar', 'unknown', 'shadow'].includes(t.name));
  return Promise.all(refs.map((r) => get<Type>(r.url)));
}

export async function typeNames(): Promise<Map<string, string>> {
  const types = await allTypes();
  return new Map(types.map((t) => [t.name, englishName(t)]));
}

export async function allGenerations(): Promise<Generation[]> {
  const list = await getList('generation');
  const gens = await Promise.all(list.map((r) => get<Generation>(r.url)));
  return gens.sort((a, b) => a.id - b.id);
}

export async function versionGroups(): Promise<Map<string, VersionGroup>> {
  const list = await getList('version-group');
  const groups = await Promise.all(list.map((r) => get<VersionGroup>(r.url)));
  return new Map(groups.map((g) => [g.name, g]));
}

/**
 * Turn a list of Pokémon references (from type, move or ability data) into
 * species cards: alternate forms are dropped, and each Pokémon maps to the
 * species with the same ID. Sorted by dex number.
 */
export async function toSpeciesCards<T extends { pokemon: NamedRef }>(
  items: T[],
): Promise<(SpeciesSummary & { item: T })[]> {
  const index = await speciesIndex();
  const seen = new Set<number>();
  const out: (SpeciesSummary & { item: T })[] = [];
  for (const item of items) {
    if (isAlternateForm(item.pokemon)) continue;
    const id = idFromUrl(item.pokemon.url);
    if (seen.has(id)) continue;
    seen.add(id);
    const s = index.get(id) ?? { id, name: item.pokemon.name, label: humanize(item.pokemon.name) };
    out.push({ ...s, item });
  }
  return out.sort((a, b) => a.id - b.id);
}
