// Server-side PokeAPI client. All data is fetched over HTTP at request time; responses are
// kept in a short-lived in-memory cache so that pages needing many records stay fast.

import { data } from "react-router";
import { english, englishName, humanize, idFromUrl, type NamedRef } from "./format";

const CACHE_TTL_MS = 60_000;
const MAX_FORM_ID = 10_000; // Pokémon IDs above this are alternate forms.
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export function apiBase(): string {
  return (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");
}

type CacheEntry = { expires: number; value: Promise<unknown> };
const cache = new Map<string, CacheEntry>();

function toUrl(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) {
    // Resource URLs in responses are absolute; re-root them on the configured base.
    const { pathname, search } = new URL(pathOrUrl);
    return `${apiBase()}${pathname}${search}`;
  }
  const [path, search] = pathOrUrl.split("?");
  const clean = path.replace(/^\/+|\/+$/g, "");
  return `${apiBase()}/api/v2/${clean}/${search ? `?${search}` : ""}`;
}

/** Fetches a PokeAPI resource; resolves to `null` when the API responds 404. */
export function getJson<T = any>(pathOrUrl: string): Promise<T | null> {
  const url = toUrl(pathOrUrl);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value as Promise<T | null>;

  const value = (async () => {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) throw new Error(`PokeAPI ${res.status} for ${url}`);
    return (await res.json()) as T;
  })();
  cache.set(url, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  return value;
}

/** Like getJson, but a missing resource becomes a 404 response for the route. */
export async function requireJson<T = any>(pathOrUrl: string): Promise<T> {
  const result = await getJson<T>(pathOrUrl);
  if (result === null) throw notFound();
  return result;
}

export function notFound() {
  return data("Not found", { status: 404 });
}

/** Path segments are user input; only allow API-style names. */
export function safeName(name: string | undefined): string {
  const lower = (name ?? "").toLowerCase();
  if (!/^[a-z0-9-]+$/.test(lower)) throw notFound();
  return lower;
}

async function getList(resource: string): Promise<NamedRef[]> {
  const list = await requireJson<{ results: NamedRef[] }>(`${resource}?limit=100000`);
  return list.results;
}

// ---------------------------------------------------------------------------------------
// Types

export type TypeInfo = { name: string; label: string };
export type TypeDetail = TypeInfo & { raw: any };

export async function getTypes(): Promise<TypeDetail[]> {
  const list = await getList("type");
  const refs = list.filter((t) => !EXCLUDED_TYPES.has(t.name));
  const details = await Promise.all(refs.map((t) => getJson(t.url)));
  return refs.flatMap((ref, i) => {
    const raw = details[i];
    return raw ? [{ name: ref.name, label: englishName(raw.names, ref.name), raw }] : [];
  });
}

export async function getTypeLabels(): Promise<Map<string, string>> {
  return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

export function typeInfo(labels: Map<string, string>, name: string): TypeInfo {
  return { name, label: labels.get(name) ?? humanize(name) };
}

// ---------------------------------------------------------------------------------------
// Generations

export type GenerationInfo = { name: string; label: string; species: number[] };

export async function getGenerations(): Promise<GenerationInfo[]> {
  const list = await getList("generation");
  const details = await Promise.all(list.map((g) => getJson(g.url)));
  return list.flatMap((ref, i) => {
    const raw = details[i];
    if (!raw) return [];
    return [
      {
        name: ref.name,
        label: englishName(raw.names, ref.name),
        species: raw.pokemon_species.map((s: NamedRef) => idFromUrl(s.url)),
      },
    ];
  });
}

// ---------------------------------------------------------------------------------------
// Species index and Pokémon cards

export type CardData = {
  id: number;
  name: string;
  sprite: string;
  types?: TypeInfo[];
  hidden?: boolean;
};

export type SpeciesEntry = { id: number; name: string; label: string; types: TypeInfo[]; generation?: string };

export async function getSpeciesNames(): Promise<Map<number, string>> {
  const list = await getList("pokemon-species");
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

export async function getSpeciesIndex(): Promise<SpeciesEntry[]> {
  const [names, types, generations] = await Promise.all([getSpeciesNames(), getTypes(), getGenerations()]);

  const typesById = new Map<number, { slot: number; type: TypeInfo }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.raw.pokemon as { slot: number; pokemon: NamedRef }[]) {
      const id = idFromUrl(pokemon.url);
      if (!(id <= MAX_FORM_ID)) continue;
      const entry = typesById.get(id) ?? [];
      entry.push({ slot, type: { name: type.name, label: type.label } });
      typesById.set(id, entry);
    }
  }

  const generationById = new Map<number, string>();
  for (const generation of generations) {
    for (const id of generation.species) generationById.set(id, generation.name);
  }

  return [...names]
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
      generation: generationById.get(id),
    }))
    .sort((a, b) => a.id - b.id);
}

export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

/**
 * Turns references to Pokémon (not species) into cards for their species, leaving out
 * alternate forms, ordered by dex number.
 */
export async function cardsForPokemon(refs: { pokemon: NamedRef; hidden?: boolean }[]): Promise<CardData[]> {
  const speciesNames = await getSpeciesNames();
  const cards = new Map<number, CardData>();
  for (const { pokemon, hidden } of refs) {
    const id = idFromUrl(pokemon.url);
    if (!(id <= MAX_FORM_ID) || cards.has(id)) continue;
    const card: CardData = { id, name: speciesNames.get(id) ?? pokemon.name, sprite: spriteUrl(id) };
    if (hidden) card.hidden = true;
    cards.set(id, card);
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------------------
// Effects

export function effectText(resource: any): string | undefined {
  const entry = english<{ short_effect: string; language: { name: string } }>(resource.effect_entries);
  if (!entry?.short_effect) return undefined;
  const chance = resource.effect_chance;
  return entry.short_effect.replace(/\$effect_chance/g, chance == null ? "" : String(chance)).replace(/\s+/g, " ").trim();
}
