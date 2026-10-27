// PokeAPI client: fetches over HTTP at request time with a short-lived in-memory cache,
// plus helpers that turn raw API records into what the pages need.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '');

const TTL_MS = 60_000;
const MAX_CONCURRENT = 32;

type Named = { name: string; url: string };
type Localized<K extends string = 'name'> = { language: Named } & Record<K, string>;

export class NotFoundError extends Error {}

const cache = new Map<string, { expires: number; value: Promise<any> }>();

let active = 0;
const queue: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

/** GET an API path such as `pokemon/25` (or an absolute API URL). Throws NotFoundError on 404. */
export function get<T = any>(pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE_URL}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;
  const value = limited<T>(async () => {
    const res = await fetch(url);
    if (res.status === 404) throw new NotFoundError(url);
    if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
    return (await res.json()) as T;
  });
  cache.set(url, { expires: now + TTL_MS, value });
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  return value;
}

const list = (resource: string) => get<{ results: Named[] }>(`${resource}/?limit=100000`).then((r) => r.results);

// ---------- Naming helpers ----------

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const humanize = (name: string) =>
  name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

export const englishName = (record: { name: string; names?: Localized[] }) =>
  record.names?.find((n) => n.language.name === 'en')?.name ?? humanize(record.name);

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

export const latestFlavorText = (entries: { flavor_text: string; language: Named }[] | undefined) => {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  return en.length ? en[en.length - 1].flavor_text.replace(/\s+/g, ' ').trim() : undefined;
};

export const isAlternateForm = (pokemonId: number) => pokemonId > 10000;

// ---------- Species index (home page and cards) ----------

export type SpeciesRef = { id: number; name: string };
export type TypeRef = { name: string; label: string };

/** Every species, by ID. */
export async function speciesList(): Promise<SpeciesRef[]> {
  const results = await list('pokemon-species');
  return results.map((r) => ({ id: idFromUrl(r.url), name: r.name })).sort((a, b) => a.id - b.id);
}

export async function speciesById(): Promise<Map<number, SpeciesRef>> {
  return new Map((await speciesList()).map((s) => [s.id, s]));
}

const HIDDEN_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The 18 types in API order, with full records. */
export async function mainTypes() {
  const results = (await list('type')).filter((t) => !HIDDEN_TYPES.has(t.name));
  return Promise.all(results.map((t) => getType(t.name)));
}

export const getType = (name: string) => get(`type/${encodeURIComponent(name)}`);

export async function typeLabel(name: string): Promise<string> {
  try {
    return englishName(await getType(name));
  } catch {
    return humanize(name);
  }
}

export async function generations() {
  const results = await list('generation');
  return Promise.all(results.map((g) => get(`generation/${g.name}`)));
}

export type IndexEntry = SpeciesRef & { types: TypeRef[]; generation?: string };

/** Species list joined with each default Pokémon's types and the species' generation. */
export async function speciesIndex(): Promise<IndexEntry[]> {
  const [species, types, gens] = await Promise.all([speciesList(), mainTypes(), generations()]);
  const typesById = new Map<number, { slot: number; type: TypeRef }[]>();
  for (const type of types) {
    const ref = { name: type.name, label: englishName(type) };
    for (const p of type.pokemon as { slot: number; pokemon: Named }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (isAlternateForm(id)) continue;
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id)!.push({ slot: p.slot, type: ref });
    }
  }
  const genBySpecies = new Map<string, string>();
  for (const gen of gens) for (const s of gen.pokemon_species as Named[]) genBySpecies.set(s.name, gen.name);
  return species.map((s) => ({
    ...s,
    types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
    generation: genBySpecies.get(s.name),
  }));
}

/**
 * Maps Pokémon references (as found in type, move and ability data) to species cards:
 * drops alternate forms, dedupes, and orders by dex number.
 */
export async function cardsForPokemon<T extends { pokemon: Named }>(refs: T[]) {
  const byId = await speciesById();
  const seen = new Map<number, { species: SpeciesRef; ref: T }>();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (isAlternateForm(id) || seen.has(id)) continue;
    const species = byId.get(id) ?? { id, name: ref.pokemon.name };
    seen.set(id, { species, ref });
  }
  return [...seen.values()].sort((a, b) => a.species.id - b.species.id);
}

// ---------- Moves ----------

export type MoveInfo = {
  name: string;
  label: string;
  type: TypeRef;
  category?: string;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export async function moveInfo(name: string): Promise<MoveInfo> {
  const move = await get(`move/${encodeURIComponent(name)}`);
  return {
    name: move.name,
    label: englishName(move),
    type: { name: move.type.name, label: await typeLabel(move.type.name) },
    category: move.damage_class ? humanize(move.damage_class.name) : undefined,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
  };
}
