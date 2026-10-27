import "server-only";

import { apiBase, get, list, type Generation, type NamedRef, type Type } from "./api";
import { englishName, humanize, idFromUrl } from "./format";

// Alternate forms (Mega Evolutions etc.) have Pokémon IDs above this.
const MAX_SPECIES_ID = 10000;
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export type TypeInfo = { name: string; label: string };

export type CardData = {
  id: number;
  name: string;
  label: string;
  sprite: string;
  types?: TypeInfo[];
  note?: string;
};

export function spriteUrl(pokemonId: number): string {
  return `${apiBase()}/media/sprites/pokemon/${pokemonId}.png`;
}

// species ID -> species name, for every species the API lists.
export async function getSpeciesNames(): Promise<Map<number, string>> {
  const results = await list("pokemon-species");
  return new Map(results.map((r) => [idFromUrl(r.url), r.name]));
}

// The 18 types, in API order, with their full records.
export async function getTypes(): Promise<(TypeInfo & { record: Type })[]> {
  const refs = (await list("type")).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await Promise.all(refs.map((t) => get<Type>(`type/${t.name}`)));
  return records.map((record) => ({ name: record.name, label: englishName(record.names, record.name), record }));
}

export async function getTypeLabels(): Promise<Map<string, string>> {
  const types = await getTypes();
  return new Map(types.map((t) => [t.name, t.label]));
}

export function typeInfo(labels: Map<string, string>, name: string): TypeInfo {
  return { name, label: labels.get(name) ?? humanize(name) };
}

export async function getGenerations(): Promise<(TypeInfo & { record: Generation })[]> {
  const refs = await list("generation");
  const records = await Promise.all(refs.map((g) => get<Generation>(`generation/${g.name}`)));
  return records.map((record) => ({ name: record.name, label: englishName(record.names, record.name), record }));
}

// Cards for a list of Pokémon references (as found in type, move and ability data),
// mapped to their species, without alternate forms, ordered by dex number.
export async function cardsForPokemon<T extends { pokemon: NamedRef }>(
  entries: T[],
  extra?: (entry: T) => Partial<CardData>,
): Promise<CardData[]> {
  const speciesNames = await getSpeciesNames();
  const cards = new Map<number, CardData>();
  for (const entry of entries) {
    const id = idFromUrl(entry.pokemon.url);
    if (!(id <= MAX_SPECIES_ID) || cards.has(id)) continue;
    const name = speciesNames.get(id);
    if (!name) continue;
    cards.set(id, { id, name, label: humanize(name), sprite: spriteUrl(id), ...extra?.(entry) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

export type IndexEntry = { id: number; name: string; label: string; types: string[]; generation?: string };

// Everything the home page filters on, for every species.
export async function getSpeciesIndex(): Promise<IndexEntry[]> {
  const [speciesNames, types, generations] = await Promise.all([getSpeciesNames(), getTypes(), getGenerations()]);

  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.record.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!(id <= MAX_SPECIES_ID)) continue;
      const slots = typesById.get(id) ?? [];
      slots.push({ slot, name: type.name });
      typesById.set(id, slots);
    }
  }

  const generationById = new Map<number, string>();
  for (const generation of generations) {
    for (const species of generation.record.pokemon_species) {
      generationById.set(idFromUrl(species.url), generation.name);
    }
  }

  return [...speciesNames]
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
      generation: generationById.get(id),
    }))
    .sort((a, b) => a.id - b.id);
}
