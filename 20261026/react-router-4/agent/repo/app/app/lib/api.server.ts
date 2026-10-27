// Server-side access to the PokeAPI server. Everything is fetched over HTTP at request
// time; responses are cached in memory for a short while so a page that needs many
// records (or many pages in a row) doesn't refetch them on every request.

import { data } from "react-router";
import type { NamedRef } from "./format";
import { humanize, idFromUrl } from "./format";

const CACHE_TTL_MS = 60_000;

export function apiBase() {
  return (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");
}

type Entry = { expires: number; promise: Promise<unknown> };
const cache = new Map<string, Entry>();

class NotFoundError extends Error {}

async function getJson<T>(path: string): Promise<T> {
  const url = `${apiBase()}/api/v2/${path}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.promise as Promise<T>;

  const promise = fetch(url).then(async (res) => {
    if (res.status === 404) throw new NotFoundError(url);
    if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
    return res.json();
  });
  cache.set(url, { expires: now + CACHE_TTL_MS, promise });
  // Don't keep failures around.
  promise.catch(() => {
    if (cache.get(url)?.promise === promise) cache.delete(url);
  });
  return promise as Promise<T>;
}

export function notFound(): never {
  throw data(null, { status: 404, statusText: "Not Found" });
}

/** Fetches a single record by name; a 404 from the API becomes a 404 page. */
async function getRecord<T>(resource: string, name: string): Promise<T> {
  if (!/^[a-z0-9-]+$/i.test(name)) notFound();
  try {
    return await getJson<T>(`${resource}/${encodeURIComponent(name.toLowerCase())}/`);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// API shapes (only the fields the app uses)

type LocalizedName = { name: string; language: NamedRef };

export type ApiSpecies = {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: { flavor_text: string; language: NamedRef }[];
  generation: NamedRef;
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
};

export type ApiPokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[];
  types: { slot: number; type: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
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

export type ApiMove = {
  id: number;
  name: string;
  names: LocalizedName[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  damage_class: NamedRef | null;
  type: NamedRef;
  effect_entries: { short_effect: string; language: NamedRef }[];
  flavor_text_entries: { flavor_text: string; language: NamedRef }[];
  learned_by_pokemon: NamedRef[];
};

export type ApiAbility = {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: { short_effect: string; language: NamedRef }[];
  flavor_text_entries: { flavor_text: string; language: NamedRef }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
};

export type ApiType = {
  id: number;
  name: string;
  names: LocalizedName[];
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

export type ApiGeneration = {
  id: number;
  name: string;
  names: LocalizedName[];
  pokemon_species: NamedRef[];
};

export type ApiVersionGroup = { id: number; name: string; order: number };

export type ApiChainLink = { species: NamedRef; evolves_to: ApiChainLink[] };
export type ApiEvolutionChain = { id: number; chain: ApiChainLink };

type ApiList = { count: number; results: NamedRef[] };

// ---------------------------------------------------------------------------

export const getSpecies = (name: string) => getRecord<ApiSpecies>("pokemon-species", name);
export const getMove = (name: string) => getRecord<ApiMove>("move", name);
export const getAbility = (name: string) => getRecord<ApiAbility>("ability", name);
export const getType = (name: string) => getRecord<ApiType>("type", name);

export const getPokemonById = (id: number) => getJson<ApiPokemon>(`pokemon/${id}/`);
export const getVersionGroup = (name: string) => getJson<ApiVersionGroup>(`version-group/${name}/`);
export const getEvolutionChain = (url: string) =>
  getJson<ApiEvolutionChain>(`evolution-chain/${idFromUrl(url)}/`);

const listAll = (resource: string) => getJson<ApiList>(`${resource}/?limit=100000`);

export const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export type SpeciesIndex = Map<number, string>;

/** Species ID -> species name, for every species the API lists. */
export async function getSpeciesIndex(): Promise<SpeciesIndex> {
  const list = await listAll("pokemon-species");
  const index: SpeciesIndex = new Map();
  for (const ref of list.results) index.set(idFromUrl(ref.url), ref.name);
  return index;
}

/** The 18 types, in API order. */
export async function getMainTypes(): Promise<ApiType[]> {
  const list = await listAll("type");
  const refs = list.results.filter((t) => !EXCLUDED_TYPES.has(t.name));
  return Promise.all(refs.map((t) => getJson<ApiType>(`type/${idFromUrl(t.url)}/`)));
}

/** Type name -> English name, for every type in the API. */
export async function getTypeNames(): Promise<Record<string, string>> {
  const types = await getMainTypes();
  return Object.fromEntries(types.map((t) => [t.name, englishName(t)]));
}

export async function getGenerations(): Promise<ApiGeneration[]> {
  const list = await listAll("generation");
  const gens = await Promise.all(
    list.results.map((g) => getJson<ApiGeneration>(`generation/${idFromUrl(g.url)}/`)),
  );
  return gens.sort((a, b) => a.id - b.id);
}

export async function getMoves(names: string[]): Promise<Map<string, ApiMove>> {
  const moves = await Promise.all(names.map((n) => getJson<ApiMove>(`move/${n}/`)));
  return new Map(moves.map((m) => [m.name, m]));
}

// ---------------------------------------------------------------------------
// Localization helpers

export function englishName(resource: { name: string; names: LocalizedName[] }): string {
  return resource.names.find((n) => n.language.name === "en")?.name ?? humanize(resource.name);
}


export function latestEnglishFlavorText(
  entries: { flavor_text: string; language: NamedRef }[] | undefined,
): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === "en");
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, " ").trim() : null;
}

export function englishShortEffect(
  entries: { short_effect: string; language: NamedRef }[] | undefined,
): string | null {
  const entry = (entries ?? []).find((e) => e.language.name === "en");
  return entry ? entry.short_effect.replace(/\s+/g, " ").trim() : null;
}

// ---------------------------------------------------------------------------
// Pokémon cards

export type Card = {
  id: number;
  name: string;
  sprite: string;
  types?: { name: string; label: string }[];
  hidden?: boolean;
};

export function spriteUrl(id: number) {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

/**
 * Turns Pokémon references into species cards, dropping alternate forms (and anything
 * the species list doesn't know), deduplicated and ordered by dex number.
 */
export function cardsFromPokemon<T extends { url: string }>(
  refs: T[],
  species: SpeciesIndex,
  extra?: (ref: T) => Partial<Card>,
): Card[] {
  const byId = new Map<number, Card>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    const name = species.get(id);
    if (!name || id > 10000 || byId.has(id)) continue;
    byId.set(id, { id, name, sprite: spriteUrl(id), ...extra?.(ref) });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
