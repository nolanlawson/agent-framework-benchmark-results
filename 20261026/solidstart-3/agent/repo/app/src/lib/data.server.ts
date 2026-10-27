// Builds the page data from PokeAPI responses. Server-only.
import { humanize } from "./format";
import { api, apiBase, apiList, english, englishName, idFromUrl, latestFlavorText } from "./pokeapi.server";
import type {
  AbilityDetail,
  Card,
  EvolutionNode,
  LearnTable,
  MoveDetail,
  MoveRow,
  Named,
  PokedexIndex,
  PokemonDetail,
  TypeDetail,
} from "./types";

const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
const MAX_SPECIES_ID = 10000;

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

const slug = (name: string) => encodeURIComponent(name.toLowerCase());

export { apiBase };

async function speciesNames(): Promise<Map<number, string>> {
  const list = await apiList("pokemon-species");
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

/** The 18 types with English names, in API order, plus their full records. */
async function allTypes(): Promise<{ named: Named[]; records: any[] }> {
  const list = (await apiList("type")).filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await Promise.all(list.map((t) => api(t.url)));
  const named = list.map((t, i) => ({ name: t.name, label: records[i] ? englishName(records[i]) : humanize(t.name) }));
  return { named, records };
}

async function typeLabels(): Promise<Map<string, string>> {
  const { named } = await allTypes();
  return new Map(named.map((t) => [t.name, t.label]));
}

function namedType(labels: Map<string, string>, name: string): Named {
  return { name, label: labels.get(name) ?? humanize(name) };
}

/** Maps Pokémon references to species cards, dropping alternate forms. */
async function toCards<T extends { pokemon: { url: string } }>(refs: T[], extra?: (ref: T) => Partial<Card>): Promise<Card[]> {
  const species = await speciesNames();
  const cards = new Map<number, Card>();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    const name = species.get(id);
    if (id > MAX_SPECIES_ID || !name || cards.has(id)) continue;
    cards.set(id, { id, name, ...extra?.(ref) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

export async function pokedexIndex(): Promise<PokedexIndex> {
  const [speciesList, types, generationList] = await Promise.all([
    apiList("pokemon-species"),
    allTypes(),
    apiList("generation"),
  ]);
  const generationRecords = await Promise.all(generationList.map((g) => api(g.url)));

  const typesById = new Map<number, { slot: number; name: string }[]>();
  types.named.forEach((type, i) => {
    for (const ref of types.records[i]?.pokemon ?? []) {
      const id = idFromUrl(ref.pokemon.url);
      if (id > MAX_SPECIES_ID) continue;
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id)!.push({ slot: ref.slot, name: type.name });
    }
  });

  const generationById = new Map<number, string>();
  generationRecords.forEach((gen, i) => {
    for (const s of gen?.pokemon_species ?? []) generationById.set(idFromUrl(s.url), generationList[i].name);
  });

  const species = speciesList
    .map((s) => {
      const id = idFromUrl(s.url);
      return {
        id,
        name: s.name,
        types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
        generation: generationById.get(id) ?? "",
      };
    })
    .sort((a, b) => a.id - b.id);

  return {
    species,
    types: types.named,
    generations: generationList.map((g, i) => ({
      name: g.name,
      label: generationRecords[i] ? englishName(generationRecords[i]) : humanize(g.name),
    })),
  };
}

export async function typeIndex(): Promise<Named[]> {
  return (await allTypes()).named;
}

function evolutionTree(node: any): EvolutionNode {
  return { name: node.species.name, children: (node.evolves_to ?? []).map(evolutionTree) };
}

export async function pokemonDetail(name: string): Promise<PokemonDetail | null> {
  const species = await api(`pokemon-species/${slug(name)}`);
  if (!species) return null;
  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const [pokemon, chain, labels] = await Promise.all([
    api(variety ? variety.pokemon.url : `pokemon/${species.id}`),
    species.evolution_chain ? api(species.evolution_chain.url) : null,
    typeLabels(),
  ]);
  if (!pokemon) return null;

  const gameNames = new Set<string>();
  for (const move of pokemon.moves ?? []) {
    for (const d of move.version_group_details) gameNames.add(d.version_group.name);
  }
  const groups = await Promise.all([...gameNames].map((g) => api(`version-group/${slug(g)}`)));
  const games = [...gameNames]
    .map((g, i) => ({ name: g, order: groups[i]?.order ?? 0 }))
    .sort((a, b) => a.order - b.order)
    .map((g) => ({ name: g.name, label: humanize(g.name) }));

  return {
    id: species.id,
    pokemonName: pokemon.name,
    label: englishName(species),
    genus: english<any>(species.genera)?.genus ?? null,
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t: any) => namedType(labels, t.type.name)),
    artwork: pokemon.sprites?.other?.["official-artwork"]?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: pokemon.height,
    weight: pokemon.weight,
    flavorText: latestFlavorText(species.flavor_text_entries),
    stats: pokemon.stats.map((s: any) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: chain?.chain ? evolutionTree(chain.chain) : { name: species.name, children: [] },
    games,
  };
}

export async function learnset(pokemonName: string, game: string): Promise<LearnTable[]> {
  const pokemon = await api(`pokemon/${slug(pokemonName)}`);
  if (!pokemon) return [];
  const entries: { move: string; url: string; method: string; level: number }[] = [];
  for (const move of pokemon.moves ?? []) {
    for (const d of move.version_group_details) {
      if (d.version_group.name !== game) continue;
      entries.push({ move: move.move.name, url: move.move.url, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const [moves, labels] = await Promise.all([
    Promise.all([...new Set(entries.map((e) => e.url))].map((url) => api(url))),
    typeLabels(),
  ]);
  const byName = new Map(moves.filter(Boolean).map((m: any) => [m.name, m]));

  const tables = new Map<string, MoveRow[]>();
  for (const e of entries) {
    const move = byName.get(e.move);
    if (!tables.has(e.method)) tables.set(e.method, []);
    tables.get(e.method)!.push({
      level: e.method === "level-up" ? e.level : null,
      name: e.move,
      label: move ? englishName(move) : humanize(e.move),
      type: namedType(labels, move?.type?.name ?? "unknown"),
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    });
  }

  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  return [...tables.entries()]
    .map(([method, rows]) => ({ method, label: humanize(method), rows }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label));
}

export async function moveDetail(name: string): Promise<MoveDetail | null> {
  const move = await api(`move/${slug(name)}`);
  if (!move) return null;
  const [labels, learnedBy] = await Promise.all([
    typeLabels(),
    toCards((move.learned_by_pokemon ?? []).map((p: any) => ({ pokemon: p }))),
  ]);
  return {
    label: englishName(move),
    type: namedType(labels, move.type.name),
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: english<any>(move.effect_entries)?.short_effect ?? latestFlavorText(move.flavor_text_entries),
    learnedBy,
  };
}

export async function abilityDetail(name: string): Promise<AbilityDetail | null> {
  const ability = await api(`ability/${slug(name)}`);
  if (!ability) return null;
  return {
    label: englishName(ability),
    effect: english<any>(ability.effect_entries)?.short_effect ?? latestFlavorText(ability.flavor_text_entries),
    pokemon: await toCards<any>(ability.pokemon ?? [], (ref) => ({ hidden: ref.is_hidden })),
  };
}

const RELATIONS: [string, string][] = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
];

export async function typeDetail(name: string): Promise<TypeDetail | null> {
  const type = await api(`type/${slug(name)}`);
  if (!type) return null;
  const [labels, pokemon] = await Promise.all([typeLabels(), toCards<any>(type.pokemon ?? [])]);
  return {
    label: englishName(type),
    relations: RELATIONS.map(([term, key]) => ({
      term,
      types: (type.damage_relations?.[key] ?? []).map((t: any) => namedType(labels, t.name)),
    })),
    pokemon,
    moves: (type.moves ?? [])
      .map((m: any) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a: Named, b: Named) => a.label.localeCompare(b.label)),
  };
}
