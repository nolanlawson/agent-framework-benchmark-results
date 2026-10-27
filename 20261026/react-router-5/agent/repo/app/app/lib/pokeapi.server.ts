// Server-only access to the PokeAPI. Every response is fetched over HTTP at request time
// and kept in memory for a short while, so the app follows changes to the live data.

import { data } from "react-router";
import { humanize } from "./format";

const API_BASE_URL = (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");
const CACHE_TTL_MS = 60_000;
const MAX_CONCURRENT_FETCHES = 16;

/** Pokémon IDs above this are alternate forms, which the app leaves out. */
const FORM_ID_START = 10000;
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export type NamedRef = { name: string; url: string };
type Named = { name: string; language: NamedRef };
type Flavor = { flavor_text: string; language: NamedRef };
type Effect = { short_effect: string; language: NamedRef };

export type TypeRef = { name: string; label: string };
export type Card = { id: number; name: string; sprite: string; types?: TypeRef[]; hidden?: boolean };

// ---------------------------------------------------------------------------
// Fetching and caching

const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;
  const value = load();
  cache.set(key, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key);
  });
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

/** Fetches `/api/v2/<path>`, returning null when the API has no such resource. */
function get<T>(path: string): Promise<T | null> {
  const url = `${API_BASE_URL}/api/v2/${path.replace(/^\/+/, "")}`;
  return cached(url, () =>
    withSlot(async () => {
      const res = await fetch(url);
      if (res.status === 404) {
        await res.body?.cancel();
        return null;
      }
      if (!res.ok) throw new Error(`PokeAPI ${res.status} for ${url}`);
      return (await res.json()) as T;
    }),
  );
}

/** Like `get`, but a missing resource becomes a 404 response for the route. */
async function getOrNotFound<T>(path: string): Promise<T> {
  const result = await get<T>(path);
  if (result === null) throw notFound();
  return result;
}

export function notFound() {
  return data("Not found", { status: 404 });
}

/** Checks a route param before using it in an API path. */
function validName(name: string | undefined): string {
  if (!name || !/^[a-z0-9-]+$/i.test(name)) throw notFound();
  return name.toLowerCase();
}

// ---------------------------------------------------------------------------
// Helpers

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}

function englishName(names: Named[] | undefined, fallback: string) {
  return names?.find((n) => n.language.name === "en")?.name ?? humanize(fallback);
}

function latestEnglishFlavor(entries: Flavor[] | undefined): string | null {
  const english = (entries ?? []).filter((e) => e.language.name === "en");
  const last = english[english.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, " ").trim() : null;
}

function englishShortEffect(entries: Effect[] | undefined): string | null {
  const text = entries?.find((e) => e.language.name === "en")?.short_effect;
  return text ? text.replace(/\s+/g, " ").trim() : null;
}

function spriteUrl(id: number) {
  return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
}

// ---------------------------------------------------------------------------
// Shared indexes

type ListResponse = { count: number; results: NamedRef[] };

async function getAll(resource: string): Promise<NamedRef[]> {
  const list = await get<ListResponse>(`${resource}/?limit=100000&offset=0`);
  return list?.results ?? [];
}

type SpeciesListEntry = { id: number; name: string };

/** Every species, ordered by dex number. */
async function getSpeciesList(): Promise<SpeciesListEntry[]> {
  const results = await getAll("pokemon-species");
  return results.map((r) => ({ id: idFromUrl(r.url), name: r.name })).sort((a, b) => a.id - b.id);
}

async function getSpeciesNames(): Promise<Map<number, string>> {
  return new Map((await getSpeciesList()).map((s) => [s.id, s.name]));
}

type TypeDetail = {
  id: number;
  name: string;
  names: Named[];
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
  damage_relations: Record<string, NamedRef[]>;
};

/** The 18 types, in API order, with their details. */
async function getTypeDetails(): Promise<TypeDetail[]> {
  const list = (await getAll("type")).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const details = await Promise.all(list.map((t) => get<TypeDetail>(`type/${t.name}`)));
  return details.filter((d): d is TypeDetail => d !== null);
}

export async function getTypeOptions(): Promise<TypeRef[]> {
  return (await getTypeDetails()).map((t) => ({ name: t.name, label: englishName(t.names, t.name) }));
}

async function getTypeLabels(): Promise<Map<string, string>> {
  return new Map((await getTypeOptions()).map((t) => [t.name, t.label]));
}

function typeRef(labels: Map<string, string>, name: string): TypeRef {
  return { name, label: labels.get(name) ?? humanize(name) };
}

type GenerationDetail = { id: number; name: string; names: Named[]; pokemon_species: NamedRef[] };

async function getGenerations(): Promise<GenerationDetail[]> {
  const list = await getAll("generation");
  const details = await Promise.all(list.map((g) => get<GenerationDetail>(`generation/${g.name}`)));
  return details.filter((d): d is GenerationDetail => d !== null).sort((a, b) => a.id - b.id);
}

/** Turns Pokémon references into species cards, leaving out alternate forms. */
async function toCards<T extends { pokemon: NamedRef }>(
  refs: T[],
  extra?: (ref: T) => Partial<Card>,
): Promise<Card[]> {
  const speciesNames = await getSpeciesNames();
  const seen = new Set<number>();
  const cards: Card[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    if (!(id < FORM_ID_START) || seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, name: speciesNames.get(id) ?? ref.pokemon.name, sprite: spriteUrl(id), ...extra?.(ref) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Pokémon list

export type ListFilters = { q: string; type: string; generation: string; page: number };
export const PAGE_SIZE = 48;

export async function getPokemonList(filters: ListFilters) {
  const [species, types, generations] = await Promise.all([getSpeciesList(), getTypeDetails(), getGenerations()]);

  const typesById = new Map<number, { slot: number; type: TypeRef }[]>();
  for (const t of types) {
    const ref = { name: t.name, label: englishName(t.names, t.name) };
    for (const p of t.pokemon) {
      const id = idFromUrl(p.pokemon.url);
      if (!(id < FORM_ID_START)) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot: p.slot, type: ref });
      typesById.set(id, list);
    }
  }

  const selectedGeneration = generations.find((g) => g.name === filters.generation);
  const generationIds = selectedGeneration
    ? new Set(selectedGeneration.pokemon_species.map((s) => idFromUrl(s.url)))
    : null;
  const query = filters.q.trim().toLowerCase();

  const matches = species
    .map((s) => ({
      ...s,
      types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
    }))
    .filter((s) => !query || humanize(s.name).toLowerCase().includes(query))
    .filter((s) => !filters.type || s.types.some((t) => t.name === filters.type))
    .filter((s) => !generationIds || generationIds.has(s.id));

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const cards: Card[] = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((s) => ({ id: s.id, name: s.name, sprite: spriteUrl(s.id), types: s.types }));

  return {
    cards,
    count: matches.length,
    page,
    totalPages,
    typeOptions: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })),
    generationOptions: generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) })),
  };
}

// ---------------------------------------------------------------------------
// Pokémon page

type SpeciesDetail = {
  id: number;
  name: string;
  names: Named[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: Flavor[];
  evolution_chain: { url: string } | null;
};

type PokemonDetail = {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedRef }[];
  abilities: { slot: number; is_hidden: boolean; ability: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> };
  moves: {
    move: NamedRef;
    version_group_details: { level_learned_at: number; version_group: NamedRef; move_learn_method: NamedRef }[];
  }[];
};

type ChainLink = { species: NamedRef; evolves_to: ChainLink[] };
export type EvolutionNode = { name: string; children: EvolutionNode[] };

type MoveDetail = {
  id: number;
  name: string;
  names: Named[];
  type: NamedRef;
  damage_class: NamedRef | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: Effect[];
  flavor_text_entries: Flavor[];
  learned_by_pokemon: NamedRef[];
};

export type MoveRow = {
  level: number | null;
  name: string;
  label: string;
  type: TypeRef;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MoveTable = { method: string; label: string; rows: MoveRow[] };

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

function compareMethods(a: string, b: string) {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return humanize(a).localeCompare(humanize(b));
}

function toEvolutionNode(link: ChainLink): EvolutionNode {
  return { name: link.species.name, children: link.evolves_to.map(toEvolutionNode) };
}

export async function getPokemonPage(rawName: string | undefined, requestedGame: string | null) {
  const species = await getOrNotFound<SpeciesDetail>(`pokemon-species/${validName(rawName)}`);
  const [pokemon, chain, typeLabels] = await Promise.all([
    getOrNotFound<PokemonDetail>(`pokemon/${species.id}`),
    species.evolution_chain ? get<{ chain: ChainLink }>(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null,
    getTypeLabels(),
  ]);

  // Version groups in which this Pokémon learns moves, in game order.
  const groupNames = [
    ...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
  ];
  const groups = await Promise.all(groupNames.map(async (name) => {
    const detail = await get<{ order: number }>(`version-group/${name}`);
    return { name, label: humanize(name), order: detail?.order ?? Infinity };
  }));
  groups.sort((a, b) => a.order - b.order);
  const game =
    groups.find((g) => g.name === requestedGame)?.name ?? groups[groups.length - 1]?.name ?? null;

  // Moves learned in the selected game, grouped by learn method.
  const entries = new Map<string, { method: string; level: number | null; move: string }>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      const method = d.move_learn_method.name;
      const level = method === "level-up" ? d.level_learned_at : null;
      entries.set(`${method}|${level}|${m.move.name}`, { method, level, move: m.move.name });
    }
  }
  const moveNames = [...new Set([...entries.values()].map((e) => e.move))];
  const moveDetails = new Map(
    (await Promise.all(moveNames.map((name) => get<MoveDetail>(`move/${name}`)))).flatMap((m, i) =>
      m ? [[moveNames[i], m] as const] : [],
    ),
  );

  const tables = new Map<string, MoveRow[]>();
  for (const entry of entries.values()) {
    const move = moveDetails.get(entry.move);
    const rows = tables.get(entry.method) ?? [];
    rows.push({
      level: entry.level,
      name: entry.move,
      label: englishName(move?.names, entry.move),
      type: typeRef(typeLabels, move?.type.name ?? "unknown"),
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    });
    tables.set(entry.method, rows);
  }
  const moveTables: MoveTable[] = [...tables.entries()]
    .sort(([a], [b]) => compareMethods(a, b))
    .map(([method, rows]) => ({ method, label: humanize(method), rows }));

  const stats = pokemon.stats.map((s) => ({
    name: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  return {
    id: species.id,
    name: species.name,
    label: englishName(species.names, species.name),
    genus: species.genera.find((g) => g.language.name === "en")?.genus ?? null,
    flavorText: latestEnglishFlavor(species.flavor_text_entries),
    artwork: pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default ?? null,
    height: pokemon.height,
    weight: pokemon.weight,
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(typeLabels, t.type.name)),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    stats,
    evolution: chain ? toEvolutionNode(chain.chain) : { name: species.name, children: [] },
    games: groups.map(({ name, label }) => ({ name, label })),
    game,
    moveTables,
  };
}

// ---------------------------------------------------------------------------
// Move, ability and type pages

export async function getMovePage(rawName: string | undefined) {
  const move = await getOrNotFound<MoveDetail>(`move/${validName(rawName)}`);
  const [typeLabels, learnedBy] = await Promise.all([
    getTypeLabels(),
    toCards(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  return {
    name: move.name,
    label: englishName(move.names, move.name),
    type: typeRef(typeLabels, move.type.name),
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries),
    learnedBy,
  };
}

type AbilityDetail = {
  name: string;
  names: Named[];
  effect_entries: Effect[];
  flavor_text_entries: Flavor[];
  pokemon: { is_hidden: boolean; pokemon: NamedRef }[];
};

export async function getAbilityPage(rawName: string | undefined) {
  const ability = await getOrNotFound<AbilityDetail>(`ability/${validName(rawName)}`);
  return {
    name: ability.name,
    label: englishName(ability.names, ability.name),
    effect: englishShortEffect(ability.effect_entries) ?? latestEnglishFlavor(ability.flavor_text_entries),
    pokemon: await toCards(ability.pokemon, (ref) => ({ hidden: ref.is_hidden })),
  };
}

const DAMAGE_RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
] as const;

export async function getTypePage(rawName: string | undefined) {
  const type = await getOrNotFound<TypeDetail>(`type/${validName(rawName)}`);
  const [typeLabels, pokemon] = await Promise.all([getTypeLabels(), toCards(type.pokemon)]);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return {
    name: type.name,
    label: englishName(type.names, type.name),
    relations: DAMAGE_RELATIONS.map(([key, label]) => ({
      label,
      types: (type.damage_relations[key] ?? []).map((t) => typeRef(typeLabels, t.name)),
    })),
    pokemon,
    moves,
  };
}
