"use server";
// Server-only data layer. Everything is fetched from the PokeAPI server at request time;
// responses are kept in memory for a short while so that a page view (which may need
// dozens of records) doesn't hammer the API.

import { humanize } from "./format";
import type {
  AbilityDetail,
  Card,
  EvolutionNode,
  FilterOptions,
  MoveDetail,
  MoveRow,
  MoveTable,
  NamedLabel,
  PokemonDetail,
  PokemonListPage,
  PokemonMoves,
  TypeDetail,
} from "./types";

const CACHE_TTL_MS = 60_000;
const PAGE_SIZE = 48;
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
const MAX_FORM_ID = 10000;

/* ---------- fetching ---------- */

type Json = any;
type Named = { name: string; url: string };
type LocalizedName = { name: string; language: { name: string } };

const apiBase = () => (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");

// Resource URLs in API responses are absolute; re-root them on the configured base.
function rebase(url: string) {
  const match = url.match(/\/(api\/v2|media)\/.*$/);
  return match ? `${apiBase()}${match[0]}` : url;
}

const cache = new Map<string, { expires: number; value: Promise<Json | null> }>();

function api(pathOrUrl: string): Promise<Json | null> {
  const url = /^https?:/.test(pathOrUrl) ? rebase(pathOrUrl) : `${apiBase()}/api/v2/${pathOrUrl}`;
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = (async () => {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API request failed (${res.status}): ${url}`);
    return res.json();
  })();
  cache.set(url, { expires: Date.now() + CACHE_TTL_MS, value });
  value.catch(() => cache.delete(url));
  return value;
}

const segment = (name: string) => encodeURIComponent(name.toLowerCase());

const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ---------- text helpers ---------- */

const englishName = (record: { name: string; names?: LocalizedName[] }) =>
  record.names?.find((n) => n.language.name === "en")?.name ?? humanize(record.name);

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

function latestEnglishFlavor(entries: { flavor_text: string; language: { name: string } }[] | undefined) {
  const english = (entries ?? []).filter((e) => e.language.name === "en");
  return english.length ? collapse(english[english.length - 1].flavor_text) : null;
}

function englishShortEffect(entries: { short_effect: string; language: { name: string } }[] | undefined) {
  const entry = (entries ?? []).find((e) => e.language.name === "en");
  return entry?.short_effect ? collapse(entry.short_effect) : null;
}

/* ---------- shared indexes ---------- */

async function speciesIndex() {
  const list = await api("pokemon-species/?limit=100000");
  const species = (list?.results ?? []).map((r: Named) => ({ id: idFromUrl(r.url), name: r.name }));
  const byId = new Map<number, string>(species.map((s: { id: number; name: string }) => [s.id, s.name]));
  return { species: species as { id: number; name: string }[], byId };
}

async function typeRecords(): Promise<Json[]> {
  const list = await api("type/?limit=1000");
  const named = (list?.results ?? []).filter((r: Named) => !EXCLUDED_TYPES.has(r.name));
  return (await Promise.all(named.map((r: Named) => api(r.url)))).filter(Boolean);
}

async function typeLabels() {
  const records = await typeRecords();
  return new Map<string, string>(records.map((t) => [t.name, englishName(t)]));
}

const typeRef = (name: string, labels: Map<string, string>): NamedLabel => ({
  name,
  label: labels.get(name) ?? humanize(name),
});

const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`;

// Pokémon references (type, move, ability data) -> species cards, without alternate forms.
async function cardsForPokemon<T extends { pokemon: Named }>(entries: T[], extra?: (entry: T) => Partial<Card>) {
  const { byId } = await speciesIndex();
  const cards = new Map<number, Card>();
  for (const entry of entries) {
    const id = idFromUrl(entry.pokemon.url);
    if (!Number.isFinite(id) || id > MAX_FORM_ID || cards.has(id)) continue;
    const name = byId.get(id) ?? entry.pokemon.name;
    cards.set(id, { id, name, label: humanize(name), sprite: spriteUrl(id), ...extra?.(entry) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

/* ---------- home ---------- */

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const [types, generationList] = await Promise.all([typeRecords(), api("generation/?limit=1000")]);
  const generations = await Promise.all((generationList?.results ?? []).map((r: Named) => api(r.url)));
  return {
    types: types.map((t) => ({ name: t.name, label: englishName(t) })),
    generations: generations
      .filter(Boolean)
      .sort((a, b) => a.id - b.id)
      .map((g) => ({ name: g.name, label: englishName(g) })),
  };
}

export async function fetchPokemonList(q: string, type: string, generation: string, page: number): Promise<PokemonListPage> {
  const [{ species }, types] = await Promise.all([speciesIndex(), typeRecords()]);

  // Types of each species' default Pokémon, in slot order.
  const typesById = new Map<number, { slot: number; type: NamedLabel }[]>();
  for (const t of types) {
    const ref = { name: t.name, label: englishName(t) };
    for (const p of t.pokemon as { slot: number; pokemon: Named }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (id > MAX_FORM_ID) continue;
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id)!.push({ slot: p.slot, type: ref });
    }
  }

  let generationIds: Set<number> | null = null;
  if (generation) {
    const record = await api(`generation/${segment(generation)}`);
    generationIds = new Set((record?.pokemon_species ?? []).map((s: Named) => idFromUrl(s.url)));
  }

  const needle = q.trim().toLowerCase();
  const matches = species
    .filter((s) => s.id <= MAX_FORM_ID)
    .filter((s) => !needle || humanize(s.name).toLowerCase().includes(needle))
    .filter((s) => !type || (typesById.get(s.id) ?? []).some((t) => t.type.name === type))
    .filter((s) => !generationIds || generationIds.has(s.id))
    .sort((a, b) => a.id - b.id);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const items = matches.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((s) => ({
    id: s.id,
    name: s.name,
    label: humanize(s.name),
    sprite: spriteUrl(s.id),
    types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
  }));
  return { total: matches.length, page: current, totalPages, items };
}

/* ---------- Pokémon ---------- */

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

async function speciesAndPokemon(name: string) {
  const species = await api(`pokemon-species/${segment(name)}`);
  if (!species) return null;
  const variety = species.varieties?.find((v: { is_default: boolean }) => v.is_default) ?? species.varieties?.[0];
  const pokemon = await api(variety ? variety.pokemon.url : `pokemon/${species.id}`);
  if (!pokemon) return null;
  return { species, pokemon };
}

function evolutionTree(link: Json): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(evolutionTree),
  };
}

export async function fetchPokemon(name: string): Promise<PokemonDetail | null> {
  const found = await speciesAndPokemon(name);
  if (!found) return null;
  const { species, pokemon } = found;
  const [labels, chain] = await Promise.all([
    typeLabels(),
    species.evolution_chain?.url ? api(species.evolution_chain.url) : null,
  ]);
  const sprites = pokemon.sprites ?? {};
  const artwork = sprites.other?.["official-artwork"]?.front_default ?? sprites.front_default ?? null;
  return {
    id: species.id,
    name: species.name,
    label: englishName(species),
    genus: species.genera?.find((g: { language: { name: string } }) => g.language.name === "en")?.genus ?? null,
    types: [...pokemon.types]
      .sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot)
      .map((t: { type: Named }) => typeRef(t.type.name, labels)),
    artwork: artwork ? rebase(artwork) : null,
    height: pokemon.height,
    weight: pokemon.weight,
    flavorText: latestEnglishFlavor(species.flavor_text_entries),
    stats: pokemon.stats.map((s: { base_stat: number; stat: Named }) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...pokemon.abilities]
      .sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot)
      .map((a: { ability: Named; is_hidden: boolean }) => ({
        name: a.ability.name,
        label: humanize(a.ability.name),
        hidden: a.is_hidden,
      })),
    evolution: chain?.chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
  };
}

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

function compareMethods(a: string, b: string) {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return humanize(a).localeCompare(humanize(b));
}

export async function fetchPokemonMoves(name: string, game: string | undefined): Promise<PokemonMoves | null> {
  const found = await speciesAndPokemon(name);
  if (!found) return null;
  const { pokemon } = found;

  type Detail = { level_learned_at: number; version_group: Named; move_learn_method: Named };
  const entries = pokemon.moves as { move: Named; version_group_details: Detail[] }[];

  const groupUrls = new Map<string, string>();
  for (const m of entries) for (const d of m.version_group_details) groupUrls.set(d.version_group.name, d.version_group.url);
  const groups = await Promise.all([...groupUrls].map(async ([groupName, url]) => {
    const record = await api(url);
    return { name: groupName, order: record?.order ?? idFromUrl(url) };
  }));
  groups.sort((a, b) => a.order - b.order);
  const games = groups.map((g) => ({ name: g.name, label: humanize(g.name) }));
  const selected = games.some((g) => g.name === game) ? game! : (games.at(-1)?.name ?? null);
  if (!selected) return { games, selected, tables: [] };

  const learned = entries.flatMap((m) =>
    m.version_group_details
      .filter((d) => d.version_group.name === selected)
      .map((d) => ({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at })),
  );

  const labels = await typeLabels();
  const moveUrls = [...new Set(learned.map((l) => l.move.url))];
  const moves = new Map<string, Json>();
  await mapLimit(moveUrls, 16, async (url) => moves.set(url, await api(url)));

  const byMethod = new Map<string, MoveRow[]>();
  for (const l of learned) {
    const move = moves.get(l.move.url);
    const row: MoveRow = {
      level: l.method === "level-up" ? l.level : null,
      name: l.move.name,
      label: move ? englishName(move) : humanize(l.move.name),
      type: move?.type ? typeRef(move.type.name, labels) : null,
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
    if (!byMethod.has(l.method)) byMethod.set(l.method, []);
    byMethod.get(l.method)!.push(row);
  }

  const tables: MoveTable[] = [...byMethod.keys()].sort(compareMethods).map((method) => ({
    method,
    label: humanize(method),
    rows: byMethod
      .get(method)!
      .sort((a, b) => (method === "level-up" ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label)),
  }));
  return { games, selected, tables };
}

/* ---------- moves, abilities, types ---------- */

export async function fetchMove(name: string): Promise<MoveDetail | null> {
  const move = await api(`move/${segment(name)}`);
  if (!move) return null;
  const [labels, learnedBy] = await Promise.all([
    typeLabels(),
    cardsForPokemon((move.learned_by_pokemon ?? []).map((p: Named) => ({ pokemon: p }))),
  ]);
  return {
    name: move.name,
    label: englishName(move),
    type: move.type ? typeRef(move.type.name, labels) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries),
    learnedBy,
  };
}

export async function fetchAbility(name: string): Promise<AbilityDetail | null> {
  const ability = await api(`ability/${segment(name)}`);
  if (!ability) return null;
  const pokemon = await cardsForPokemon(ability.pokemon as { is_hidden: boolean; pokemon: Named }[], (entry) => ({
    hidden: entry.is_hidden,
  }));
  return {
    name: ability.name,
    label: englishName(ability),
    effect: englishShortEffect(ability.effect_entries) ?? latestEnglishFlavor(ability.flavor_text_entries),
    pokemon,
  };
}

export async function fetchTypes(): Promise<NamedLabel[]> {
  return (await typeRecords()).map((t) => ({ name: t.name, label: englishName(t) }));
}

const RELATIONS: [string, string][] = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
];

export async function fetchType(name: string): Promise<TypeDetail | null> {
  const type = await api(`type/${segment(name)}`);
  if (!type) return null;
  const [labels, pokemon] = await Promise.all([typeLabels(), cardsForPokemon(type.pokemon ?? [])]);
  return {
    name: type.name,
    label: englishName(type),
    relations: RELATIONS.map(([term, key]) => ({
      term,
      types: (type.damage_relations?.[key] ?? []).map((t: Named) => typeRef(t.name, labels)),
    })),
    pokemon,
    moves: (type.moves ?? [])
      .map((m: Named) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a: NamedLabel, b: NamedLabel) => a.label.localeCompare(b.label)),
  };
}
