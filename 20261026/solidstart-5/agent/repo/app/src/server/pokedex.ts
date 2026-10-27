// Server-only: turns raw PokeAPI records into the compact shapes the pages render.

import { humanize } from "~/lib/format";
import type {
  AbilityPage,
  Card,
  EvolutionNode,
  FilterOptions,
  MovePage,
  MoveRow,
  MoveTable,
  Option,
  PokemonListResult,
  PokemonPage,
  TypePage,
  TypeRef,
} from "~/lib/types";
import { api, apiRequired, idFromUrl, spriteUrl } from "./api";

// --- Raw API shapes (only the fields we use) ---------------------------------------

interface Ref {
  name: string;
  url: string;
}
interface Named {
  name: string;
  language: Ref;
}
interface ListResponse {
  count: number;
  results: Ref[];
}
interface FlavorText {
  flavor_text: string;
  language: Ref;
}
interface EffectEntry {
  short_effect: string;
  language: Ref;
}
interface RawType {
  id: number;
  name: string;
  names: Named[];
  pokemon: { slot: number; pokemon: Ref }[];
  moves: Ref[];
  damage_relations: Record<string, Ref[]>;
}
interface RawGeneration {
  name: string;
  names: Named[];
  pokemon_species: Ref[];
}
interface RawSpecies {
  id: number;
  name: string;
  names: Named[];
  genera: { genus: string; language: Ref }[];
  flavor_text_entries: FlavorText[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: Ref }[];
}
interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: Ref }[];
  stats: { base_stat: number; stat: Ref }[];
  abilities: { slot: number; is_hidden: boolean; ability: Ref }[];
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> };
  moves: {
    move: Ref;
    version_group_details: { level_learned_at: number; move_learn_method: Ref; version_group: Ref }[];
  }[];
}
interface RawChainLink {
  species: Ref;
  evolves_to: RawChainLink[];
}
interface RawMove {
  name: string;
  names: Named[];
  type: Ref | null;
  damage_class: Ref | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_chance: number | null;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: Ref[];
}
interface RawAbility {
  name: string;
  names: Named[];
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: Ref }[];
}
interface RawVersionGroup {
  name: string;
  order: number;
}

// --- Helpers -----------------------------------------------------------------------

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
/** Pokémon IDs above this are alternate forms. */
const MAX_DEFAULT_ID = 10_000;
const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};
const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];
const ALL = "?limit=100000";

const isEnglish = (entry: { language: Ref }) => entry.language.name === "en";

function englishName(names: Named[], fallback: string): string {
  return names.find(isEnglish)?.name ?? humanize(fallback);
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function latestFlavorText(entries: FlavorText[]): string | null {
  const english = entries.filter(isEnglish);
  const last = english[english.length - 1];
  return last ? collapse(last.flavor_text) : null;
}

function shortEffect(entries: EffectEntry[], chance?: number | null): string | null {
  const entry = entries.find(isEnglish);
  if (!entry?.short_effect) return null;
  const text = chance == null ? entry.short_effect : entry.short_effect.replaceAll("$effect_chance", String(chance));
  return collapse(text);
}

/** Normalizes a name taken from the URL for use in an API path. */
function slug(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

const byLabel = (a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label);

// --- Shared indexes ----------------------------------------------------------------

/** Species ID → species name, for every species the API lists. */
async function speciesNames(): Promise<Map<number, string>> {
  const list = await apiRequired<ListResponse>(`pokemon-species${ALL}`);
  return new Map(list.results.map((r) => [idFromUrl(r.url), r.name]));
}

/** The 18 types, in API order, with their records. */
async function allTypes(): Promise<RawType[]> {
  const list = await apiRequired<ListResponse>(`type${ALL}`);
  const refs = list.results.filter((r) => !EXCLUDED_TYPES.has(r.name));
  return Promise.all(refs.map((r) => apiRequired<RawType>(r.url)));
}

async function typeLabels(): Promise<Map<string, string>> {
  const types = await allTypes();
  return new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));
}

function typeRef(labels: Map<string, string>, name: string): TypeRef {
  return { name, label: labels.get(name) ?? humanize(name) };
}

async function allGenerations(): Promise<RawGeneration[]> {
  const list = await apiRequired<ListResponse>(`generation${ALL}`);
  const refs = [...list.results].sort((a, b) => idFromUrl(a.url) - idFromUrl(b.url));
  return Promise.all(refs.map((r) => apiRequired<RawGeneration>(r.url)));
}

/**
 * Cards for a list of Pokémon references (from a type, move or ability), mapped to
 * their species and ordered by dex number. Alternate forms are left out.
 */
async function cardsFor<T extends { pokemon: Ref }>(entries: T[], extra?: (entry: T) => Partial<Card>): Promise<Card[]> {
  const names = await speciesNames();
  const seen = new Set<number>();
  const cards: Card[] = [];
  for (const entry of entries) {
    const id = idFromUrl(entry.pokemon.url);
    if (!(id <= MAX_DEFAULT_ID) || seen.has(id)) continue;
    seen.add(id);
    const name = names.get(id) ?? entry.pokemon.name;
    cards.push({ id, name, label: humanize(name), sprite: spriteUrl(id), ...extra?.(entry) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

// --- Home --------------------------------------------------------------------------

export async function filterOptions(): Promise<FilterOptions> {
  const [types, generations] = await Promise.all([allTypes(), allGenerations()]);
  return {
    types: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })),
    generations: generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) })),
  };
}

interface IndexEntry {
  card: Card;
  search: string;
  types: Set<string>;
  generation: string | null;
}

async function pokemonIndex(): Promise<IndexEntry[]> {
  const [names, types, generations] = await Promise.all([speciesNames(), allTypes(), allGenerations()]);

  const typesById = new Map<number, { slot: number; ref: TypeRef }[]>();
  for (const type of types) {
    const ref = { name: type.name, label: englishName(type.names, type.name) };
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!(id <= MAX_DEFAULT_ID)) continue;
      let list = typesById.get(id);
      if (!list) typesById.set(id, (list = []));
      list.push({ slot, ref });
    }
  }

  const generationById = new Map<number, string>();
  for (const gen of generations) {
    for (const species of gen.pokemon_species) generationById.set(idFromUrl(species.url), gen.name);
  }

  return [...names]
    .sort(([a], [b]) => a - b)
    .map(([id, name]) => {
      const typeList = (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.ref);
      const label = humanize(name);
      return {
        card: { id, name, label, sprite: spriteUrl(id), types: typeList },
        search: label.toLowerCase(),
        types: new Set(typeList.map((t) => t.name)),
        generation: generationById.get(id) ?? null,
      };
    });
}

export const PAGE_SIZE = 48;

export async function pokemonList(q: string, type: string, generation: string, page: number): Promise<PokemonListResult> {
  const index = await pokemonIndex();
  const needle = q.trim().toLowerCase();
  const matches = index.filter(
    (e) =>
      (!needle || e.search.includes(needle)) &&
      (!type || e.types.has(type)) &&
      (!generation || e.generation === generation),
  );
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return {
    total: matches.length,
    page: current,
    pages,
    cards: matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((e) => e.card),
  };
}

// --- Pokémon -------------------------------------------------------------------------

async function loadPokemon(name: string): Promise<{ species: RawSpecies; pokemon: RawPokemon } | null> {
  const species = await api<RawSpecies>(`pokemon-species/${slug(name)}`);
  if (!species) return null;
  const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
  const pokemon = await apiRequired<RawPokemon>(variety ? variety.pokemon.url : `pokemon/${species.id}`);
  return { species, pokemon };
}

function evolutionTree(link: RawChainLink): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: link.evolves_to.map(evolutionTree),
  };
}

async function versionGroupsFor(pokemon: RawPokemon): Promise<Option[]> {
  const names = new Set<string>();
  for (const move of pokemon.moves) for (const d of move.version_group_details) names.add(d.version_group.name);
  const groups = await Promise.all(
    [...names].map(async (name) => (await api<RawVersionGroup>(`version-group/${name}`)) ?? { name, order: Infinity }),
  );
  return groups.sort((a, b) => a.order - b.order).map((g) => ({ name: g.name, label: humanize(g.name) }));
}

export async function pokemonPage(name: string): Promise<PokemonPage | null> {
  const loaded = await loadPokemon(name);
  if (!loaded) return null;
  const { species, pokemon } = loaded;

  const [labels, chain, games] = await Promise.all([
    typeLabels(),
    species.evolution_chain ? api<{ chain: RawChainLink }>(species.evolution_chain.url) : null,
    versionGroupsFor(pokemon),
  ]);

  return {
    id: species.id,
    name: species.name,
    label: englishName(species.names, species.name),
    genus: species.genera.find(isEnglish)?.genus ?? null,
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(labels, t.type.name)),
    artwork: pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default ?? null,
    height: pokemon.height,
    weight: pokemon.weight,
    flavor: latestFlavorText(species.flavor_text_entries),
    stats: pokemon.stats.map((s) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    games,
  };
}

function methodRank(method: string): number {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

/**
 * Move tables for one version group, one per learn method, in display order. An unknown
 * or empty `requested` game falls back to the latest one.
 */
export async function pokemonMoves(name: string, requested: string): Promise<{ game: string; tables: MoveTable[] } | null> {
  const loaded = await loadPokemon(name);
  if (!loaded) return null;
  const { pokemon } = loaded;
  const games = await versionGroupsFor(pokemon);
  const game = games.some((g) => g.name === requested) ? requested : (games[games.length - 1]?.name ?? "");

  const learned: { move: Ref; method: string; level: number }[] = [];
  for (const { move, version_group_details } of pokemon.moves) {
    for (const d of version_group_details) {
      if (d.version_group.name === game) learned.push({ move, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }

  const [labels, moves] = await Promise.all([
    typeLabels(),
    Promise.all([...new Set(learned.map((l) => l.move.url))].map((url) => api<RawMove>(url))),
  ]);
  const movesByName = new Map(moves.filter((m): m is RawMove => m !== null).map((m) => [m.name, m]));

  const tables = new Map<string, MoveRow[]>();
  for (const { move, method, level } of learned) {
    const raw = movesByName.get(move.name);
    const row: MoveRow = {
      level: method === "level-up" ? level : null,
      name: move.name,
      label: raw ? englishName(raw.names, raw.name) : humanize(move.name),
      type: raw?.type ? typeRef(labels, raw.type.name) : null,
      category: raw?.damage_class ? humanize(raw.damage_class.name) : null,
      power: raw?.power ?? null,
      accuracy: raw?.accuracy ?? null,
      pp: raw?.pp ?? null,
    };
    let rows = tables.get(method);
    if (!rows) tables.set(method, (rows = []));
    rows.push(row);
  }

  const sorted = [...tables]
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label));
  return { game, tables: sorted };
}

// --- Moves, abilities, types ---------------------------------------------------------

export async function movePage(name: string): Promise<MovePage | null> {
  const move = await api<RawMove>(`move/${slug(name)}`);
  if (!move) return null;
  const [labels, learnedBy] = await Promise.all([
    typeLabels(),
    cardsFor(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  return {
    name: move.name,
    label: englishName(move.names, move.name),
    type: move.type ? typeRef(labels, move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: shortEffect(move.effect_entries, move.effect_chance) ?? latestFlavorText(move.flavor_text_entries),
    learnedBy,
  };
}

export async function abilityPage(name: string): Promise<AbilityPage | null> {
  const ability = await api<RawAbility>(`ability/${slug(name)}`);
  if (!ability) return null;
  return {
    name: ability.name,
    label: englishName(ability.names, ability.name),
    effect: shortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries),
    pokemon: await cardsFor(ability.pokemon, (entry) => ({ hidden: entry.is_hidden })),
  };
}

export async function typeList(): Promise<Option[]> {
  const types = await allTypes();
  return types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) }));
}

const RELATIONS: [key: string, label: string][] = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
];

export async function typePage(name: string): Promise<TypePage | null> {
  const key = name.trim().toLowerCase();
  if (EXCLUDED_TYPES.has(key)) return null;
  const type = await api<RawType>(`type/${slug(key)}`);
  if (!type || EXCLUDED_TYPES.has(type.name)) return null;
  const [labels, pokemon] = await Promise.all([typeLabels(), cardsFor(type.pokemon)]);
  return {
    name: type.name,
    label: englishName(type.names, type.name),
    relations: RELATIONS.map(([relation, label]) => ({
      label,
      types: (type.damage_relations[relation] ?? []).map((t) => typeRef(labels, t.name)),
    })),
    pokemon,
    moves: type.moves.map((m) => ({ name: m.name, label: humanize(m.name) })).sort(byLabel),
  };
}
