// Server-side data layer. Fetches PokeAPI resources over HTTP at request time (with a
// short-lived in-memory cache) and shapes them into the compact view models the pages
// render. Used by the /data/* endpoints and, in-process, by server-side rendering.

import type {
  AbilityData,
  CardData,
  EvolutionNode,
  IndexData,
  IndexEntry,
  LearnMethod,
  Loaded,
  MoveData,
  MoveSummary,
  NamedLabel,
  PokemonData,
  TypeData,
  TypeListData,
} from '../app/models';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 3000;
const MAX_CONCURRENT_FETCHES = 24;
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
const MAX_SPECIES_ID = 10000;

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export class NotFoundError extends Error {}

function apiBase(): string {
  return (process.env['API_BASE_URL'] || 'http://localhost:9000').replace(/\/+$/, '');
}

// ---------------------------------------------------------------------------------------
// Fetching and caching

interface CacheEntry {
  expires: number;
  value: Promise<unknown>;
}
const cache = new Map<string, CacheEntry>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) {
    // Refresh recency for LRU eviction.
    cache.delete(key);
    cache.set(key, hit);
    return hit.value as Promise<T>;
  }
  const value = load();
  cache.set(key, { expires: now + CACHE_TTL_MS, value });
  // Failed loads shouldn't stick around.
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return value;
}

let active = 0;
const queue: (() => void)[] = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT_FETCHES) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

/** GETs `/api/v2/<path>`; resolves to null on 404. */
function api(path: string): Promise<Json | null> {
  const url = `${apiBase()}/api/v2/${path.replace(/^\/+/, '')}`;
  return cached(`api:${url}`, () =>
    withSlot(async () => {
      const res = await fetch(url);
      if (res.status === 404) {
        await res.body?.cancel();
        return null;
      }
      if (!res.ok) {
        await res.body?.cancel();
        throw new Error(`API request failed: ${res.status} ${url}`);
      }
      return res.json();
    }),
  );
}

async function apiOrThrow(path: string): Promise<Json> {
  const data = await api(path);
  if (data == null) throw new NotFoundError(path);
  return data;
}

// ---------------------------------------------------------------------------------------
// Helpers

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function idFromUrl(url: string): number {
  const m = /\/(\d+)\/?$/.exec(url);
  return m ? Number(m[1]) : NaN;
}

function english<T extends { language: { name: string } }>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language?.name === 'en');
}

function englishName(resource: Json): string {
  return english<{ name: string; language: { name: string } }>(resource.names)?.name ?? humanize(resource.name);
}

function latestEnglishFlavorText(entries: Json[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en');
  const last = en[en.length - 1];
  const text: string | undefined = last?.flavor_text ?? last?.text;
  return text ? text.replace(/\s+/g, ' ').trim() : null;
}

function spriteBase(): string {
  return `${apiBase()}/media/sprites/pokemon/`;
}

async function mapLimit<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  return Promise.all(items.map(fn));
}

// ---------------------------------------------------------------------------------------
// Shared lookups

async function speciesById(): Promise<Map<number, string>> {
  const list = await apiOrThrow('pokemon-species/?limit=100000&offset=0');
  const map = new Map<number, string>();
  for (const s of list.results as Json[]) map.set(idFromUrl(s.url), s.name);
  return map;
}

/** The 18 types, in API order, with their full records. */
async function typeRecords(): Promise<Json[]> {
  const list = await apiOrThrow('type/?limit=1000&offset=0');
  const names = (list.results as Json[]).map((t) => t.name as string).filter((n) => !EXCLUDED_TYPES.has(n));
  const records = await mapLimit(names, (n) => api(`type/${n}`));
  return records.filter((r): r is Json => r != null);
}

async function typeLabels(): Promise<Map<string, string>> {
  const records = await typeRecords();
  return new Map(records.map((t) => [t.name as string, englishName(t)]));
}

function typeRef(name: string, labels: Map<string, string>): NamedLabel {
  return { name, label: labels.get(name) ?? humanize(name) };
}

/** Maps Pokémon references to species cards, dropping alternate forms; sorted by dex number. */
function toCards(refs: { name: string; url: string; hidden?: boolean }[], species: Map<number, string>): CardData[] {
  const byId = new Map<number, CardData>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!Number.isFinite(id) || id > MAX_SPECIES_ID || byId.has(id)) continue;
    const name = species.get(id) ?? ref.name;
    const card: CardData = { id, name, label: humanize(name) };
    if (ref.hidden !== undefined) card.hidden = ref.hidden;
    byId.set(id, card);
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------------------
// Pages

export async function getIndex(): Promise<IndexData> {
  const [species, types, genList] = await Promise.all([
    speciesById(),
    typeRecords(),
    apiOrThrow('generation/?limit=1000&offset=0'),
  ]);
  const generations = (await mapLimit(genList.results as Json[], (g) => api(`generation/${g.name}`))).filter(
    (g): g is Json => g != null,
  );

  const typesById = new Map<number, { slot: number; type: string }[]>();
  for (const t of types) {
    for (const p of t.pokemon as Json[]) {
      const id = idFromUrl(p.pokemon.url);
      if (id > MAX_SPECIES_ID) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot: p.slot, type: t.name });
      typesById.set(id, list);
    }
  }
  const genById = new Map<number, string>();
  for (const g of generations) {
    for (const s of g.pokemon_species as Json[]) genById.set(idFromUrl(s.url), g.name);
  }

  const pokemon: IndexEntry[] = [...species.entries()]
    .filter(([id]) => id <= MAX_SPECIES_ID)
    .sort(([a], [b]) => a - b)
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
      generation: genById.get(id) ?? '',
    }));

  return {
    spriteBase: spriteBase(),
    types: types.map((t) => ({ name: t.name, label: englishName(t) })),
    generations: generations.map((g) => ({ name: g.name, label: englishName(g) })),
    pokemon,
  };
}

async function moveSummary(name: string, labels: Map<string, string>): Promise<MoveSummary> {
  const move = await apiOrThrow(`move/${name}`);
  return {
    name: move.name,
    label: englishName(move),
    type: typeRef(move.type?.name ?? 'unknown', labels),
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
  };
}

function evolutionTree(link: Json): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: ((link.evolves_to ?? []) as Json[]).map(evolutionTree),
  };
}

export async function getPokemon(name: string, game: string | null): Promise<PokemonData> {
  const species = await apiOrThrow(`pokemon-species/${encodeURIComponent(name)}`);
  const [pokemon, chain, labels] = await Promise.all([
    apiOrThrow(`pokemon/${species.id}`),
    species.evolution_chain?.url ? api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null,
    typeLabels(),
  ]);

  // Version groups in which the Pokémon learns moves, ordered by the group's `order`.
  const groupNames = new Set<string>();
  for (const m of pokemon.moves as Json[]) {
    for (const d of m.version_group_details as Json[]) groupNames.add(d.version_group.name);
  }
  const groups = (await mapLimit([...groupNames], (g) => api(`version-group/${g}`)))
    .filter((g): g is Json => g != null)
    .sort((a, b) => a.order - b.order || a.id - b.id);
  const selected = groups.find((g) => g.name === game) ?? groups[groups.length - 1];

  const methods: LearnMethod[] = [];
  if (selected) {
    const entries: { method: string; level: number; move: string }[] = [];
    for (const m of pokemon.moves as Json[]) {
      for (const d of m.version_group_details as Json[]) {
        if (d.version_group.name !== selected.name) continue;
        entries.push({ method: d.move_learn_method.name, level: d.level_learned_at, move: m.move.name });
      }
    }
    const summaries = new Map<string, MoveSummary>();
    await mapLimit([...new Set(entries.map((e) => e.move))], async (n) => {
      summaries.set(n, await moveSummary(n, labels));
    });

    const byMethod = new Map<string, LearnMethod>();
    for (const e of entries) {
      let method = byMethod.get(e.method);
      if (!method) {
        method = { name: e.method, label: humanize(e.method), rows: [] };
        byMethod.set(e.method, method);
      }
      method.rows.push({ level: e.method === 'level-up' ? e.level : null, move: summaries.get(e.move)! });
    }
    const rank = (m: LearnMethod) => {
      const i = METHOD_ORDER.indexOf(m.name);
      return i === -1 ? METHOD_ORDER.length : i;
    };
    methods.push(
      ...[...byMethod.values()].sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label)),
    );
    for (const m of methods) {
      m.rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.move.label.localeCompare(b.move.label));
    }
  }

  const stats = (pokemon.stats as Json[]).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    id: species.id,
    name: species.name,
    label: englishName(species),
    genus: english<{ genus: string; language: { name: string } }>(species.genera)?.genus ?? null,
    types: (pokemon.types as Json[])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => typeRef(t.type.name, labels)),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    stats,
    abilities: (pokemon.abilities as Json[])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: !!a.is_hidden })),
    evolution: chain?.chain ? evolutionTree(chain.chain) : null,
    games: groups.map((g) => ({ name: g.name, label: humanize(g.name) })),
    game: selected?.name ?? null,
    methods,
  };
}

export async function getMove(name: string): Promise<MoveData> {
  const [move, species, labels] = await Promise.all([
    apiOrThrow(`move/${encodeURIComponent(name)}`),
    speciesById(),
    typeLabels(),
  ]);
  const effect =
    english<{ short_effect: string; language: { name: string } }>(move.effect_entries)?.short_effect ??
    latestEnglishFlavorText(move.flavor_text_entries);
  return {
    name: move.name,
    label: englishName(move),
    type: typeRef(move.type?.name ?? 'unknown', labels),
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: effect ? effect.replace(/\s+/g, ' ').trim() : null,
    spriteBase: spriteBase(),
    learnedBy: toCards(move.learned_by_pokemon ?? [], species),
  };
}

export async function getAbility(name: string): Promise<AbilityData> {
  const [ability, species] = await Promise.all([apiOrThrow(`ability/${encodeURIComponent(name)}`), speciesById()]);
  const effect =
    english<{ short_effect: string; language: { name: string } }>(ability.effect_entries)?.short_effect ??
    latestEnglishFlavorText(ability.flavor_text_entries);
  return {
    name: ability.name,
    label: englishName(ability),
    effect: effect ? effect.replace(/\s+/g, ' ').trim() : null,
    spriteBase: spriteBase(),
    pokemon: toCards(
      (ability.pokemon as Json[]).map((p) => ({ ...p.pokemon, hidden: !!p.is_hidden })),
      species,
    ),
  };
}

export async function getTypeList(): Promise<TypeListData> {
  const types = await typeRecords();
  return { types: types.map((t) => ({ name: t.name, label: englishName(t) })) };
}

export async function getType(name: string): Promise<TypeData> {
  const [type, species, labels] = await Promise.all([
    apiOrThrow(`type/${encodeURIComponent(name)}`),
    speciesById(),
    typeLabels(),
  ]);
  const rel = type.damage_relations ?? {};
  const relation = (label: string, key: string) => ({
    label,
    types: ((rel[key] ?? []) as Json[]).map((t) => typeRef(t.name, labels)),
  });
  return {
    name: type.name,
    label: englishName(type),
    relations: [
      relation('Super effective against', 'double_damage_to'),
      relation('Not very effective against', 'half_damage_to'),
      relation('No effect against', 'no_damage_to'),
      relation('Weak to', 'double_damage_from'),
      relation('Resists', 'half_damage_from'),
      relation('Immune to', 'no_damage_from'),
    ],
    spriteBase: spriteBase(),
    pokemon: toCards((type.pokemon as Json[]).map((p) => p.pokemon), species),
    moves: ((type.moves ?? []) as Json[])
      .map((m) => ({ name: m.name as string, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label) || a.name.localeCompare(b.name)),
  };
}

// ---------------------------------------------------------------------------------------
// Routing for /data/* requests

/**
 * Resolves a `/data/...` URL (path plus optional query) to its view model. Unknown
 * resources resolve to `{ notFound: true }`; unknown endpoints too.
 */
export async function handleDataRequest(url: string): Promise<Loaded<unknown>> {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  const parts = pathname
    .replace(/^\/data\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p).toLowerCase());
  try {
    const [resource, name, ...rest] = parts;
    if (rest.length) throw new NotFoundError(pathname);
    if (resource === 'index' && !name) return await getIndex();
    if (resource === 'types' && !name) return await getTypeList();
    if (name) {
      if (resource === 'pokemon') return await getPokemon(name, searchParams.get('game'));
      if (resource === 'moves') return await getMove(name);
      if (resource === 'abilities') return await getAbility(name);
      if (resource === 'types') return await getType(name);
    }
    throw new NotFoundError(pathname);
  } catch (err) {
    if (err instanceof NotFoundError) return { notFound: true };
    throw err;
  }
}
