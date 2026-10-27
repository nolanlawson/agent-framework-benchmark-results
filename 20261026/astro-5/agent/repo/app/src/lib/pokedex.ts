import { api, idFromUrl, listPath, mapAll, resourcePath } from './api';

type Named = { name: string; url: string };
type Localized = { name: string; language: Named };

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
/** Pokémon IDs above this are alternate forms, which the app leaves out. */
const MAX_DEFAULT_ID = 10000;

export const humanize = (name: string) =>
  name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const englishName = (names: Localized[] | undefined, fallback: string) =>
  names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const MISSING = '—';
export const display = (value: unknown) => (value === null || value === undefined ? MISSING : String(value));

export function latestFlavorText(entries: { flavor_text: string; language: Named }[] | undefined) {
  const english = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = english.at(-1);
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : undefined;
}

export function englishShortEffect(entries: { short_effect: string; language: Named }[] | undefined) {
  const text = entries?.find((e) => e.language.name === 'en')?.short_effect;
  return text ? text.replace(/\s+/g, ' ').trim() : undefined;
}

export const isDefaultPokemon = (ref: Named) => idFromUrl(ref.url) < MAX_DEFAULT_ID;

// ---------------------------------------------------------------------------
// Types

export type TypeInfo = { name: string; label: string; record: any };

/** The 18 types in API order, with their full records. */
export async function getTypes(): Promise<TypeInfo[]> {
  const list = await api(listPath('type'));
  const names: string[] = (list?.results ?? []).map((r: Named) => r.name).filter((n: string) => !EXCLUDED_TYPES.has(n));
  const records = await mapAll(names, (n) => api(resourcePath('type', n)));
  return names.flatMap((name, i) => {
    const record = records[i];
    return record ? [{ name, label: englishName(record.names, name), record }] : [];
  });
}

export async function typeLabels(): Promise<Map<string, string>> {
  return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

// ---------------------------------------------------------------------------
// Species index (for lists and cards)

export type SpeciesEntry = {
  id: number;
  name: string;
  label: string; // humanized name
  types: string[]; // type API names, in slot order
  generation?: string;
};

export type Generation = { name: string; label: string };

export type SpeciesIndex = {
  species: SpeciesEntry[];
  byId: Map<number, SpeciesEntry>;
  types: TypeInfo[];
  generations: Generation[];
};

export async function getSpeciesIndex(): Promise<SpeciesIndex> {
  const [speciesList, types, generationList] = await Promise.all([
    api(listPath('pokemon-species')),
    getTypes(),
    api(listPath('generation')),
  ]);
  const generationNames: string[] = (generationList?.results ?? []).map((r: Named) => r.name);
  const generationRecords = await mapAll(generationNames, (n) => api(resourcePath('generation', n)));

  const species: SpeciesEntry[] = (speciesList?.results ?? [])
    .map((r: Named) => ({ id: idFromUrl(r.url), name: r.name, label: humanize(r.name), types: [] }))
    .sort((a: SpeciesEntry, b: SpeciesEntry) => a.id - b.id);
  const byId = new Map(species.map((s) => [s.id, s]));

  // A species' default Pokémon shares its ID, so type data maps straight onto species.
  const slots = new Map<number, { slot: number; type: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.record.pokemon ?? []) {
      const id = idFromUrl(pokemon.url);
      if (!byId.has(id)) continue;
      if (!slots.has(id)) slots.set(id, []);
      slots.get(id)!.push({ slot, type: type.name });
    }
  }
  for (const [id, list] of slots) byId.get(id)!.types = list.sort((a, b) => a.slot - b.slot).map((s) => s.type);

  const generations: Generation[] = [];
  generationNames.forEach((name, i) => {
    const record = generationRecords[i];
    if (!record) return;
    generations.push({ name, label: englishName(record.names, name) });
    for (const s of record.pokemon_species ?? []) {
      const entry = byId.get(idFromUrl(s.url));
      if (entry) entry.generation = name;
    }
  });

  return { species, byId, types, generations };
}

export type Card = { id: number; name: string; label: string; types?: string[]; hidden?: boolean };

/**
 * Maps Pokémon references (as found in type, move and ability data) to species cards,
 * leaving out alternate forms, ordered by dex number.
 */
export function cardsForPokemon<T extends { pokemon: Named }>(
  index: SpeciesIndex,
  refs: T[],
  extra?: (ref: T) => Partial<Card>,
): Card[] {
  const seen = new Set<number>();
  const cards: Card[] = [];
  for (const ref of refs) {
    if (!isDefaultPokemon(ref.pokemon)) continue;
    const id = idFromUrl(ref.pokemon.url);
    if (seen.has(id)) continue;
    seen.add(id);
    const species = index.byId.get(id);
    const name = species?.name ?? ref.pokemon.name;
    cards.push({ id, name, label: humanize(name), ...extra?.(ref) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Moves

export type MoveInfo = {
  name: string;
  label: string;
  type: string;
  category: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export function moveInfo(record: any): MoveInfo {
  return {
    name: record.name,
    label: englishName(record.names, record.name),
    type: record.type?.name,
    category: record.damage_class ? humanize(record.damage_class.name) : MISSING,
    power: record.power ?? null,
    accuracy: record.accuracy ?? null,
    pp: record.pp ?? null,
  };
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export function compareMethods(a: string, b: string) {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return humanize(a).localeCompare(humanize(b));
}
