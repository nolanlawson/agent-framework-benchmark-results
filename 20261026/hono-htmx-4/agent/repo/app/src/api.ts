// Data access for the PokeAPI server. Everything is fetched over HTTP at request time and
// kept in a small in-memory cache: fresh entries are served directly, stale ones are served
// while a background refresh runs, so the app follows live data without refetching on
// every request.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const FRESH_MS = 60_000;
const MAX_ENTRIES = 5000;
const MAX_CONCURRENT = 16;

type Entry = { value: unknown; fetchedAt: number; pending?: Promise<unknown> };
const cache = new Map<string, Entry>();

// Simple semaphore so large pages (hundreds of moves) don't flood the API.
let active = 0;
const queue: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

async function load(path: string): Promise<unknown> {
  return withSlot(async () => {
    const res = await fetch(`${API_BASE_URL}/api/v2/${path}`);
    if (res.status === 404) {
      await res.body?.cancel();
      return null;
    }
    if (!res.ok) throw new Error(`API ${path}: HTTP ${res.status}`);
    return res.json();
  });
}

function refresh(path: string, entry?: Entry): Promise<unknown> {
  if (entry?.pending) return entry.pending;
  const pending = load(path).then(
    (value) => {
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
      cache.set(path, { value, fetchedAt: Date.now() });
      return value;
    },
    (err) => {
      const current = cache.get(path);
      if (current) delete current.pending;
      else cache.delete(path);
      throw err;
    },
  );
  if (entry) entry.pending = pending;
  else cache.set(path, { value: undefined, fetchedAt: 0, pending });
  return pending;
}

/** GET /api/v2/<path>. Resolves to null when the resource doesn't exist. */
export async function get<T>(path: string): Promise<T | null> {
  const entry = cache.get(path);
  if (!entry || entry.fetchedAt === 0) return (await refresh(path, entry)) as T | null;
  if (Date.now() - entry.fetchedAt > FRESH_MS) refresh(path, entry).catch(() => {});
  return entry.value as T | null;
}

async function getOrThrow<T>(path: string): Promise<T> {
  const value = await get<T>(path);
  if (value == null) throw new Error(`API ${path}: not found`);
  return value;
}

// ---------------------------------------------------------------------------------------
// API shapes (only the fields the app uses)

export type Ref = { name: string; url: string };
type Named = { name: string; language: Ref };
type ListPage = { count: number; results: Ref[] };

export type Pokemon = {
  id: number;
  name: string;
  height: number;
  weight: number;
  species: Ref;
  types: { slot: number; type: Ref }[];
  abilities: { slot: number; is_hidden: boolean; ability: Ref }[];
  stats: { base_stat: number; stat: Ref }[];
  sprites: { front_default: string | null; other?: { 'official-artwork'?: { front_default: string | null } } };
  moves: {
    move: Ref;
    version_group_details: { level_learned_at: number; version_group: Ref; move_learn_method: Ref }[];
  }[];
};

export type Species = {
  id: number;
  name: string;
  names: Named[];
  genera: { genus: string; language: Ref }[];
  flavor_text_entries: { flavor_text: string; language: Ref }[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: Ref }[];
};

export type ChainLink = { species: Ref; evolves_to: ChainLink[] };
export type EvolutionChain = { id: number; chain: ChainLink };

export type Move = {
  id: number;
  name: string;
  names: Named[];
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  type: Ref;
  damage_class: Ref | null;
  effect_entries: { short_effect: string; language: Ref }[];
  flavor_text_entries: { flavor_text: string; language: Ref }[];
  learned_by_pokemon: Ref[];
};

export type Ability = {
  id: number;
  name: string;
  names: Named[];
  effect_entries: { short_effect: string; language: Ref }[];
  flavor_text_entries: { flavor_text: string; language: Ref }[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: Ref }[];
};

export type Type = {
  id: number;
  name: string;
  names: Named[];
  damage_relations: Record<
    'double_damage_to' | 'half_damage_to' | 'no_damage_to' | 'double_damage_from' | 'half_damage_from' | 'no_damage_from',
    Ref[]
  >;
  pokemon: { slot: number; pokemon: Ref }[];
  moves: Ref[];
};

export type Generation = { id: number; name: string; names: Named[]; pokemon_species: Ref[] };
export type VersionGroup = { id: number; name: string; order: number };

// ---------------------------------------------------------------------------------------
// Helpers

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const humanize = (name: string) =>
  name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const englishName = (r: { name: string; names: Named[] }) =>
  r.names.find((n) => n.language.name === 'en')?.name ?? humanize(r.name);

export const cleanText = (s: string) => s.replace(/\s+/g, ' ').trim();

export function latestEnglishFlavor(entries: { flavor_text: string; language: Ref }[]): string | null {
  const en = entries.filter((e) => e.language.name === 'en');
  return en.length ? cleanText(en[en.length - 1].flavor_text) : null;
}

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

const enc = encodeURIComponent;
const lower = (name: string) => name.toLowerCase();

export const getPokemon = (idOrName: string | number) => get<Pokemon>(`pokemon/${enc(lower(String(idOrName)))}`);
export const getSpecies = (idOrName: string | number) =>
  get<Species>(`pokemon-species/${enc(lower(String(idOrName)))}`);
export const getMove = (name: string) => get<Move>(`move/${enc(lower(name))}`);
export const getAbility = (name: string) => get<Ability>(`ability/${enc(lower(name))}`);
export const getType = (name: string) => get<Type>(`type/${enc(lower(name))}`);
export const getEvolutionChain = (id: number) => get<EvolutionChain>(`evolution-chain/${id}`);
export const getVersionGroup = (name: string) => get<VersionGroup>(`version-group/${enc(name)}`);

const listAll = (resource: string) => getOrThrow<ListPage>(`${resource}/?limit=100000`);

/** Run fn over items with the shared concurrency limit applied inside get(). */
export const mapAll = <T, R>(items: T[], fn: (item: T) => Promise<R>) => Promise.all(items.map(fn));

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types, in API order, with English names. */
export async function getTypes(): Promise<{ name: string; label: string }[]> {
  const list = await listAll('type');
  const refs = list.results.filter((r) => !EXCLUDED_TYPES.has(r.name));
  const types = await mapAll(refs, (r) => getType(r.name));
  return types.filter((t): t is Type => t != null).map((t) => ({ name: t.name, label: englishName(t) }));
}

/** English type names by API name, for labelling type links and badges. */
export async function getTypeLabels(): Promise<Map<string, string>> {
  return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

export async function getGenerations(): Promise<Generation[]> {
  const list = await listAll('generation');
  const gens = await mapAll(list.results, (r) => get<Generation>(`generation/${enc(r.name)}`));
  return gens.filter((g): g is Generation => g != null).sort((a, b) => a.id - b.id);
}

/** Every species the API lists, by ID. */
export async function getSpeciesIndex(): Promise<Map<number, string>> {
  const list = await listAll('pokemon-species');
  return new Map(list.results.map((r) => [idFromUrl(r.url), r.name]));
}

export type SpeciesSummary = { id: number; name: string; label: string };

/**
 * Maps Pokémon references (from type, move and ability data) to their species, leaving
 * out alternate forms and duplicates, ordered by dex number. `extra` is carried along
 * from the first reference for each species.
 */
export async function speciesForPokemon<X>(
  refs: { ref: Ref; extra: X }[],
): Promise<(SpeciesSummary & { extra: X })[]> {
  const index = await getSpeciesIndex();
  const out = new Map<number, SpeciesSummary & { extra: X }>();
  for (const { ref, extra } of refs) {
    const id = idFromUrl(ref.url);
    if (!id || id > 10000 || out.has(id)) continue;
    const name = index.get(id) ?? ref.name;
    out.set(id, { id, name, label: humanize(name), extra });
  }
  return [...out.values()].sort((a, b) => a.id - b.id);
}

export type DexEntry = SpeciesSummary & { types: string[]; generation: string | null };

/** Data for the home page: every species with its default Pokémon's types and generation. */
export async function getDex(): Promise<DexEntry[]> {
  const [index, typeList, generations] = await Promise.all([getSpeciesIndex(), getTypes(), getGenerations()]);
  const typeData = await mapAll(typeList, (t) => getType(t.name));
  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const t of typeData) {
    if (!t) continue;
    for (const p of t.pokemon) {
      const id = idFromUrl(p.pokemon.url);
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id)!.push({ slot: p.slot, name: t.name });
    }
  }
  const genById = new Map<number, string>();
  for (const g of generations) for (const s of g.pokemon_species) genById.set(idFromUrl(s.url), g.name);

  return [...index.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
      generation: genById.get(id) ?? null,
    }));
}
