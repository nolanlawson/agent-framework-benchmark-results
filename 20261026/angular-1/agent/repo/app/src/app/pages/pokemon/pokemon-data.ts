import { englishName, humanize, latestEnglishFlavorText } from '../../core/format';
import { EvolutionLink, Pokemon, Species } from '../../core/models';
import { PokeApi, TypeLabel } from '../../core/poke-api';

export interface StatRow {
  label: string;
  value: number;
}

export interface AbilityRow {
  name: string;
  hidden: boolean;
}

export interface EvolutionNode {
  name: string;
  evolvesTo: EvolutionNode[];
}

export interface GameOption {
  name: string;
  label: string;
  order: number;
}

export interface PokemonView {
  species: Species;
  pokemon: Pokemon;
  name: string;
  genus: string | null;
  flavorText: string | null;
  artwork: string | null;
  types: TypeLabel[];
  height: string;
  weight: string;
  stats: StatRow[];
  statTotal: number;
  abilities: AbilityRow[];
  evolution: EvolutionNode;
  /** Version groups in which the Pokémon learns moves, by the version group's `order`. */
  games: GameOption[];
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};

function toEvolutionNode(link: EvolutionLink): EvolutionNode {
  return { name: link.species.name, evolvesTo: link.evolves_to.map(toEvolutionNode) };
}

export async function loadPokemonView(api: PokeApi, name: string): Promise<PokemonView> {
  const species = await api.species(name);
  // A species' default Pokémon has the species' ID.
  const [pokemon, chain] = await Promise.all([
    api.pokemon(species.id),
    species.evolution_chain ? api.evolutionChain(species.evolution_chain.url).catch(() => null) : null,
  ]);

  const gameNames = [...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))];
  const [types, games] = await Promise.all([
    api.typeLabels([...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => t.type)),
    Promise.all(
      gameNames.map(async (game, index) => {
        const group = await api.versionGroup(game).catch(() => null);
        return { name: game, label: humanize(game), order: group?.order ?? index };
      }),
    ),
  ]);

  const stats = pokemon.stats.map((s) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat }));
  const artwork = pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default;

  return {
    species,
    pokemon,
    name: englishName(species.names, species.name),
    genus: species.genera.find((g) => g.language.name === 'en')?.genus ?? null,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    artwork: api.mediaUrl(artwork),
    types,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    stats,
    statTotal: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: chain ? toEvolutionNode(chain.chain) : { name: species.name, evolvesTo: [] },
    games: games.sort((a, b) => a.order - b.order),
  };
}
