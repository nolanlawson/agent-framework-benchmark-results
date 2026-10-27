// Data access for the PokeAPI server. Everything is fetched over HTTP at request time;
// responses are cached in memory for a short while so a page that needs many records
// (or many pages in a row) doesn't refetch the same data.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '');

const CACHE_TTL_MS = 60_000;
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const MAX_SPECIES_ID = 10_000;

type Named = { name: string; url: string };
type Localized = { language: { name: string } };

const cache = new Map<string, { expires: number; value: Promise<any> }>();

function resolve(pathOrUrl: string): string {
  return /^https?:\/\//.test(pathOrUrl) ? pathOrUrl : `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
}

/** Fetches JSON from the API. Resolves to null when the resource doesn't exist. */
export function getJson<T = any>(pathOrUrl: string): Promise<T | null> {
  const url = resolve(pathOrUrl);
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;
  const value = (async () => {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API request failed: ${res.status} ${url}`);
    return res.json();
  })();
  cache.set(url, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => cache.delete(url));
  return value;
}

async function getList(resource: string): Promise<Named[]> {
  const data = await getJson<{ results: Named[] }>(`${resource}/?limit=100000`);
  return data?.results ?? [];
}

// ---------------------------------------------------------------------------
// Formatting helpers

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

export const dexNumber = (id: number): string => `#${String(id).padStart(4, '0')}`;

export const englishName = (resource: { name: string; names?: (Localized & { name: string })[] }): string =>
  resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);

export function latestEnglishFlavorText(entries: (Localized & { flavor_text: string })[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

export function englishShortEffect(resource: {
  effect_entries?: (Localized & { short_effect: string })[];
  effect_chance?: number | null;
}): string | null {
  const entry = resource.effect_entries?.find((e) => e.language.name === 'en');
  if (!entry?.short_effect) return null;
  return entry.short_effect.replace(/\$effect_chance/g, String(resource.effect_chance ?? '')).replace(/\s+/g, ' ').trim();
}

export const spriteUrl = (id: number): string => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

export const show = (value: unknown): string => (value === null || value === undefined || value === '' ? '—' : String(value));

// ---------------------------------------------------------------------------
// Shared indexes

export type SpeciesRef = { id: number; name: string };

/** All species, keyed by ID. */
export async function getSpeciesById(): Promise<Map<number, string>> {
  const list = await getList('pokemon-species');
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

/**
 * Maps Pokémon references (from type, move and ability data) to the species they belong to,
 * leaving out alternate forms. Sorted by dex number, without duplicates.
 */
export async function pokemonRefsToSpecies<T extends { url: string }>(
  refs: T[],
): Promise<(SpeciesRef & { ref: T })[]> {
  const species = await getSpeciesById();
  const seen = new Map<number, SpeciesRef & { ref: T }>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!(id < MAX_SPECIES_ID) || seen.has(id)) continue;
    const name = species.get(id) ?? (ref as unknown as Named).name;
    seen.set(id, { id, name, ref });
  }
  return [...seen.values()].sort((a, b) => a.id - b.id);
}

export type TypeInfo = { name: string; label: string; data: any };

/** The 18 types, in API order, with their full records. */
export async function getTypes(): Promise<TypeInfo[]> {
  const list = (await getList('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await Promise.all(list.map((t) => getJson(t.url)));
  return records.flatMap((data, i) => (data ? [{ name: list[i].name, label: englishName(data), data }] : []));
}

/** English labels for every type, including ones outside the main 18. */
export async function getTypeLabels(): Promise<Map<string, string>> {
  return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

export type GenerationInfo = { name: string; label: string; speciesIds: Set<number> };

export async function getGenerations(): Promise<GenerationInfo[]> {
  const list = await getList('generation');
  const records = await Promise.all(list.map((g) => getJson(g.url)));
  return records
    .flatMap((data, i) =>
      data
        ? [
            {
              id: data.id as number,
              name: list[i].name,
              label: englishName(data),
              speciesIds: new Set<number>(data.pokemon_species.map((s: Named) => idFromUrl(s.url))),
            },
          ]
        : [],
    )
    .sort((a, b) => a.id - b.id)
    .map(({ id: _id, ...g }) => g);
}

export type ListEntry = {
  id: number;
  name: string;
  label: string;
  types: { name: string; label: string }[];
  generation: string | null;
};

/** Every species with its default Pokémon's types and its generation, for the home page. */
export async function getPokemonIndex(): Promise<{ entries: ListEntry[]; types: TypeInfo[]; generations: GenerationInfo[] }> {
  const [speciesById, types, generations] = await Promise.all([getSpeciesById(), getTypes(), getGenerations()]);
  const typesById = new Map<number, { slot: number; name: string; label: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.data.pokemon as { slot: number; pokemon: Named }[]) {
      const id = idFromUrl(pokemon.url);
      if (!(id < MAX_SPECIES_ID)) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot, name: type.name, label: type.label });
      typesById.set(id, list);
    }
  }
  const generationById = new Map<number, string>();
  for (const g of generations) for (const id of g.speciesIds) generationById.set(id, g.name);

  const entries = [...speciesById.entries()]
    .filter(([id]) => id < MAX_SPECIES_ID)
    .sort((a, b) => a[0] - b[0])
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map(({ name, label }) => ({ name, label })),
      generation: generationById.get(id) ?? null,
    }));
  return { entries, types, generations };
}
