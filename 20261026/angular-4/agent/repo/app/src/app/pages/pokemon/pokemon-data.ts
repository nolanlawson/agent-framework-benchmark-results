import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ApiChainLink, ApiEvolutionChain, ApiMove, ApiPokemon, ApiSpecies, ApiVersionGroup } from '../../core/api-types';
import { Catalog } from '../../core/catalog';
import { PokeApi } from '../../core/poke-api';
import { PageData } from '../../core/page-data';
import { LinkRef, TypeRef } from '../../core/models';
import { dexNumber, englishName, humanize, idFromUrl, latestEnglishFlavorText, mapLimit } from '../../core/format';

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

/** Learn methods shown first, in this order; any others follow alphabetically. */
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export interface EvolutionNode extends LinkRef {
  evolvesTo: EvolutionNode[];
}

export interface PokemonSummary {
  id: number;
  dex: string;
  name: string;
  /** English name. */
  label: string;
  genus: string | null;
  types: TypeRef[];
  artwork: string | null;
  height: string;
  weight: string;
  flavorText: string | null;
  stats: { label: string; value: number }[];
  abilities: (LinkRef & { hidden: boolean })[];
  evolution: EvolutionNode | null;
  /** Version groups in which the Pokémon learns moves, by version group order. */
  games: LinkRef[];
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: TypeRef;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTable {
  method: string;
  label: string;
  rows: MoveRow[];
}

export interface PokemonPageData {
  summary: PokemonSummary;
  game: string;
  moveTables: MoveTable[];
}

async function loadSummary(
  api: PokeApi,
  catalog: Catalog,
  species: ApiSpecies,
  pokemon: ApiPokemon,
): Promise<PokemonSummary> {
  const [typeLabels, chain, games] = await Promise.all([
    catalog.typeLabels(),
    species.evolution_chain
      ? api.find<ApiEvolutionChain>(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`)
      : null,
    loadGames(api, pokemon),
  ]);

  const toNode = (link: ApiChainLink): EvolutionNode => ({
    name: link.species.name,
    label: humanize(link.species.name),
    evolvesTo: link.evolves_to.map(toNode),
  });

  return {
    id: species.id,
    dex: dexNumber(species.id),
    name: species.name,
    label: englishName(species.names, species.name),
    genus: species.genera.find((g) => g.language.name === 'en')?.genus ?? null,
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map(({ type }) => ({ name: type.name, label: typeLabels.get(type.name) ?? humanize(type.name) })),
    artwork: pokemon.sprites.other?.['official-artwork']?.front_default ?? null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    stats: pokemon.stats.map((s) => ({
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain ? toNode(chain.chain) : null,
    games,
  };
}

async function loadGames(api: PokeApi, pokemon: ApiPokemon): Promise<LinkRef[]> {
  const names = new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)));
  const groups = await Promise.all([...names].map((name) => api.get<ApiVersionGroup>(`version-group/${name}`)));
  return groups.sort((a, b) => a.order - b.order).map((g) => ({ name: g.name, label: humanize(g.name) }));
}

async function loadMoveTables(
  api: PokeApi,
  catalog: Catalog,
  pokemon: ApiPokemon,
  game: string,
): Promise<MoveTable[]> {
  const learned: { method: string; level: number; move: string }[] = [];
  for (const { move, version_group_details } of pokemon.moves) {
    for (const detail of version_group_details) {
      if (detail.version_group.name !== game) continue;
      const method = detail.move_learn_method.name;
      const level = detail.level_learned_at;
      if (!learned.some((l) => l.move === move.name && l.method === method && l.level === level)) {
        learned.push({ method, level, move: move.name });
      }
    }
  }

  const moveNames = [...new Set(learned.map((l) => l.move))];
  const [typeLabels, moves] = await Promise.all([
    catalog.typeLabels(),
    mapLimit(moveNames, 16, (name) => api.get<ApiMove>(`move/${name}`)),
  ]);
  const moveByName = new Map(moves.map((m) => [m.name, m]));

  const tables = new Map<string, MoveTable>();
  for (const { method, level, move: name } of learned) {
    const move = moveByName.get(name)!;
    let table = tables.get(method);
    if (!table) {
      table = { method, label: humanize(method), rows: [] };
      tables.set(method, table);
    }
    table.rows.push({
      level: method === 'level-up' ? level : null,
      name,
      label: englishName(move.names, name),
      type: { name: move.type.name, label: typeLabels.get(move.type.name) ?? humanize(move.type.name) },
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    });
  }

  for (const table of tables.values()) {
    table.rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label));
  }

  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method);
    return i === -1 ? METHOD_ORDER.length : i;
  };
  return [...tables.values()].sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label));
}

async function loadPokemonPage(
  api: PokeApi,
  catalog: Catalog,
  name: string,
  requestedGame: string | null,
): Promise<PokemonPageData | null> {
  const species = await api.find<ApiSpecies>(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
  if (!species) return null;
  const variety = species.varieties.find((v) => v.is_default);
  const pokemon = await api.get<ApiPokemon>(`pokemon/${variety ? idFromUrl(variety.pokemon.url) : species.id}`);

  const summary = await loadSummary(api, catalog, species, pokemon);
  const game =
    summary.games.find((g) => g.name === requestedGame)?.name ?? summary.games.at(-1)?.name ?? '';
  const moveTables = game ? await loadMoveTables(api, catalog, pokemon, game) : [];
  return { summary, game, moveTables };
}

export const pokemonResolver: ResolveFn<PokemonPageData | null> = (route) => {
  const api = inject(PokeApi);
  const catalog = inject(Catalog);
  const name = route.paramMap.get('name') ?? '';
  const game = route.queryParamMap.get('game');
  return inject(PageData).load(`pokemon:${name}:${game ?? ''}`, () =>
    loadPokemonPage(api, catalog, name, game),
  );
};
