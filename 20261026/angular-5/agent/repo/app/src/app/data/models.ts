/** View models shared by the server data layer and the Angular app. */

export interface NamedRef {
  /** API name, used in URLs. */
  name: string;
  /** Text shown to the user. */
  label: string;
}

export interface PokemonCard {
  /** Species ID (the dex number). */
  id: number;
  /** Species API name. */
  name: string;
  label: string;
  sprite: string;
  types?: NamedRef[];
  hiddenAbility?: boolean;
}

export interface PokemonListPage {
  count: number;
  page: number;
  totalPages: number;
  cards: PokemonCard[];
  types: NamedRef[];
  generations: NamedRef[];
}

export interface Stat {
  label: string;
  value: number;
}

export interface AbilityRef extends NamedRef {
  hidden: boolean;
}

export interface EvolutionNode extends NamedRef {
  evolvesTo: EvolutionNode[];
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: NamedRef;
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

export interface PokemonDetail {
  id: number;
  name: string;
  label: string;
  genus: string | null;
  types: NamedRef[];
  artwork: string | null;
  height: number;
  weight: number;
  flavorText: string | null;
  stats: Stat[];
  abilities: AbilityRef[];
  evolution: EvolutionNode | null;
  games: NamedRef[];
  game: string | null;
  moveTables: MoveTable[];
}

export interface MoveDetail {
  name: string;
  label: string;
  type: NamedRef;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: PokemonCard[];
}

export interface AbilityDetail {
  name: string;
  label: string;
  effect: string | null;
  pokemon: PokemonCard[];
}

export interface DamageRelation {
  label: string;
  types: NamedRef[];
}

export interface TypeDetail {
  name: string;
  label: string;
  relations: DamageRelation[];
  pokemon: PokemonCard[];
  moves: NamedRef[];
}
