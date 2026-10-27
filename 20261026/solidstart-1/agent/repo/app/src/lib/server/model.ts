// Builds the view models for each page from PokeAPI responses. Server-only.
import { humanize } from "../format";
import type {
  AbilityData,
  Card,
  EvolutionNode,
  HomeData,
  HomeFilters,
  MoveData,
  MoveRow,
  MoveTable,
  PokemonData,
  PokemonMovesData,
  Ref,
  TypeData,
} from "../types";
import { api, apiList, apiOrNull, idFromUrl, spriteUrl } from "./pokeapi";

const PAGE_SIZE = 48;
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
const MAX_SPECIES_POKEMON_ID = 10000;

type Named = { name: string; language: { name: string } };

const english = <T extends { language: { name: string } }>(entries: T[] | undefined) =>
  entries?.filter((e) => e.language.name === "en") ?? [];

const englishName = (resource: { name: string; names?: Named[] }) =>
  english(resource.names)[0]?.name ?? humanize(resource.name);

const cleanText = (text: string) => text.replace(/\s+/g, " ").trim();

const latestFlavorText = (resource: { flavor_text_entries?: { flavor_text: string; language: { name: string } }[] }) => {
  const entries = english(resource.flavor_text_entries);
  const last = entries[entries.length - 1];
  return last ? cleanText(last.flavor_text) : null;
};

// ---------------------------------------------------------------------------
// Indexes shared by several pages

/** Species ID → species name, for every species the API lists. */
async function speciesNames(): Promise<Map<number, string>> {
  const list = await apiList("pokemon-species");
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

type TypeInfo = Ref & { id: number; detail: any };

/** All types (including the excluded ones) with English names, in API order. */
async function allTypes(): Promise<TypeInfo[]> {
  const list = await apiList("type");
  return Promise.all(
    list.map(async (t) => {
      const detail = await api(t.url);
      return { id: detail.id, name: t.name, label: englishName(detail), detail };
    }),
  );
}

const mainTypes = async () => (await allTypes()).filter((t) => !EXCLUDED_TYPES.has(t.name));

async function typeLabels(): Promise<Map<string, string>> {
  return new Map((await allTypes()).map((t) => [t.name, t.label]));
}

const typeRef = (labels: Map<string, string>, name: string): Ref => ({ name, label: labels.get(name) ?? humanize(name) });

async function generations(): Promise<(Ref & { species: number[] })[]> {
  const list = await apiList("generation");
  const details = await Promise.all(list.map((g) => api(g.url)));
  return details
    .sort((a, b) => a.id - b.id)
    .map((g) => ({
      name: g.name,
      label: englishName(g),
      species: g.pokemon_species.map((s: { url: string }) => idFromUrl(s.url)),
    }));
}

/** Turns Pokémon references into species cards: alternate forms dropped, one card per species, by dex number. */
async function cardsFor<T extends { pokemon: { name: string; url: string } }>(
  entries: T[],
  extra?: (entry: T) => Partial<Card>,
): Promise<Card[]> {
  const species = await speciesNames();
  const byId = new Map<number, Card>();
  for (const entry of entries) {
    const id = idFromUrl(entry.pokemon.url);
    if (!(id > 0) || id > MAX_SPECIES_POKEMON_ID || byId.has(id)) continue;
    const name = species.get(id) ?? entry.pokemon.name;
    byId.set(id, { id, name, label: humanize(name), sprite: spriteUrl(id), ...extra?.(entry) });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------
// Home

export async function homeData(filters: HomeFilters): Promise<HomeData> {
  const [species, types, gens] = await Promise.all([speciesNames(), mainTypes(), generations()]);

  const typesOf = new Map<number, { slot: number; ref: Ref }[]>();
  for (const type of types) {
    for (const p of type.detail.pokemon as { slot: number; pokemon: { url: string } }[]) {
      const id = idFromUrl(p.pokemon.url);
      if (!species.has(id)) continue;
      const list = typesOf.get(id) ?? [];
      list.push({ slot: p.slot, ref: { name: type.name, label: type.label } });
      typesOf.set(id, list);
    }
  }

  const query = filters.q.trim().toLowerCase();
  const generation = gens.find((g) => g.name === filters.generation);
  const genSpecies = generation ? new Set(generation.species) : null;
  const type = types.find((t) => t.name === filters.type);

  const matches: Card[] = [];
  for (const [id, name] of [...species].sort((a, b) => a[0] - b[0])) {
    const label = humanize(name);
    if (query && !label.toLowerCase().includes(query)) continue;
    if (genSpecies && !genSpecies.has(id)) continue;
    const slots = (typesOf.get(id) ?? []).sort((a, b) => a.slot - b.slot);
    if (type && !slots.some((s) => s.ref.name === type.name)) continue;
    matches.push({ id, name, label, sprite: spriteUrl(id), types: slots.map((s) => s.ref) });
  }

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(filters.page) || 1), totalPages);
  return {
    types: types.map(({ name, label }) => ({ name, label })),
    generations: gens.map(({ name, label }) => ({ name, label })),
    count: matches.length,
    page,
    totalPages,
    cards: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

// ---------------------------------------------------------------------------
// Pokémon

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

async function speciesAndPokemon(name: string) {
  const species = await apiOrNull(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
  if (!species) return null;
  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const pokemon = await api(variety ? variety.pokemon.url : `pokemon/${species.id}`);
  return { species, pokemon };
}

function evolutionTree(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(evolutionTree),
  };
}

export async function pokemonData(name: string): Promise<PokemonData | null> {
  const found = await speciesAndPokemon(name);
  if (!found) return null;
  const { species, pokemon } = found;
  const [labels, chain] = await Promise.all([
    typeLabels(),
    species.evolution_chain?.url ? apiOrNull(species.evolution_chain.url) : null,
  ]);

  const stats = (pokemon.stats as any[]).map((s) => ({
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    id: species.id,
    name: species.name,
    title: englishName(species),
    genus: english<{ genus: string; language: { name: string } }>(species.genera)[0]?.genus ?? null,
    types: [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => typeRef(labels, t.type.name)),
    artwork: pokemon.sprites?.other?.["official-artwork"]?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavor: latestFlavorText(species),
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: Boolean(a.is_hidden) })),
    evolution: chain?.chain ? evolutionTree(chain.chain) : null,
  };
}

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

function methodRank(a: string, b: string) {
  const ia = METHOD_ORDER.indexOf(a);
  const ib = METHOD_ORDER.indexOf(b);
  if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  return humanize(a).localeCompare(humanize(b));
}

export async function pokemonMovesData(name: string, game: string | null): Promise<PokemonMovesData | null> {
  const found = await speciesAndPokemon(name);
  if (!found) return null;
  const { pokemon } = found;

  const learned = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) learned.add(d.version_group.name);

  const groups = await Promise.all((await apiList("version-group")).filter((g) => learned.has(g.name)).map((g) => api(g.url)));
  groups.sort((a, b) => a.order - b.order);
  const games = groups.map((g) => ({ name: g.name as string, label: humanize(g.name) }));
  const selected = games.find((g) => g.name === game)?.name ?? games[games.length - 1]?.name ?? null;
  if (!selected) return { games, selected, tables: [] };

  const entries: { move: string; url: string; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== selected) continue;
      const key = `${m.move.name}|${d.move_learn_method.name}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push({ move: m.move.name, url: m.move.url, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }

  const labels = await typeLabels();
  const moves = new Map<string, any>();
  await Promise.all(
    [...new Set(entries.map((e) => e.url))].map(async (url) => moves.set(url, await apiOrNull(url))),
  );

  const tables = new Map<string, MoveRow[]>();
  for (const e of entries) {
    const move = moves.get(e.url);
    const row: MoveRow = {
      level: e.method === "level-up" ? e.level : null,
      name: e.move,
      label: move ? englishName(move) : humanize(e.move),
      type: move?.type ? typeRef(labels, move.type.name) : null,
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
    tables.set(e.method, [...(tables.get(e.method) ?? []), row]);
  }

  const result: MoveTable[] = [...tables.keys()].sort(methodRank).map((method) => {
    const rows = tables.get(method)!;
    rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label));
    return { method, label: humanize(method), rows };
  });
  return { games, selected, tables: result };
}

// ---------------------------------------------------------------------------
// Move, ability, type

const shortEffect = (resource: any) => {
  const entry = english<{ short_effect: string; language: { name: string } }>(resource.effect_entries)[0];
  if (!entry?.short_effect) return null;
  return cleanText(entry.short_effect.replaceAll("$effect_chance", String(resource.effect_chance ?? "")));
};

export async function moveData(name: string): Promise<MoveData | null> {
  const move = await apiOrNull(`move/${encodeURIComponent(name.toLowerCase())}`);
  if (!move) return null;
  const [labels, learnedBy] = await Promise.all([
    typeLabels(),
    cardsFor((move.learned_by_pokemon ?? []).map((p: any) => ({ pokemon: p }))),
  ]);
  return {
    name: move.name,
    title: englishName(move),
    type: move.type ? typeRef(labels, move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: shortEffect(move) ?? latestFlavorText(move),
    learnedBy,
  };
}

export async function abilityData(name: string): Promise<AbilityData | null> {
  const ability = await apiOrNull(`ability/${encodeURIComponent(name.toLowerCase())}`);
  if (!ability) return null;
  return {
    name: ability.name,
    title: englishName(ability),
    effect: shortEffect(ability) ?? latestFlavorText(ability),
    pokemon: await cardsFor(ability.pokemon ?? [], (e: any) => ({ hidden: Boolean(e.is_hidden) })),
  };
}

export async function typeListData(): Promise<Ref[]> {
  return (await mainTypes()).map(({ name, label }) => ({ name, label }));
}

const RELATIONS: [string, string][] = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
];

export async function typeData(name: string): Promise<TypeData | null> {
  const type = await apiOrNull(`type/${encodeURIComponent(name.toLowerCase())}`);
  if (!type) return null;
  const [labels, pokemon] = await Promise.all([typeLabels(), cardsFor(type.pokemon ?? [])]);
  return {
    name: type.name,
    title: englishName(type),
    relations: RELATIONS.map(([label, key]) => ({
      label,
      types: (type.damage_relations?.[key] ?? []).map((t: any) => typeRef(labels, t.name)),
    })),
    pokemon,
    moves: (type.moves ?? [])
      .map((m: any) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a: Ref, b: Ref) => a.label.localeCompare(b.label)),
  };
}
