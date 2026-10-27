// Shapes of the data the server functions hand to the UI. Everything here is plain JSON.

export interface TypeRef {
  name: string;
  label: string;
}

export interface Card {
  id: number;
  /** Species API name, used in the link. */
  name: string;
  /** Humanized species name. */
  label: string;
  sprite: string;
  types?: TypeRef[];
  hidden?: boolean;
}

export interface Option {
  name: string;
  label: string;
}

export interface FilterOptions {
  types: Option[];
  generations: Option[];
}

export interface PokemonListResult {
  total: number;
  page: number;
  pages: number;
  cards: Card[];
}

export interface EvolutionNode {
  name: string;
  label: string;
  children: EvolutionNode[];
}

export interface PokemonPage {
  id: number;
  name: string;
  label: string;
  genus: string | null;
  types: TypeRef[];
  artwork: string | null;
  height: number;
  weight: number;
  flavor: string | null;
  stats: { name: string; label: string; value: number }[];
  abilities: { name: string; label: string; hidden: boolean }[];
  evolution: EvolutionNode | null;
  /** Version groups the Pokémon learns moves in, ordered by the version group's `order`. */
  games: Option[];
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: TypeRef | null;
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

export interface MovePage {
  name: string;
  label: string;
  type: TypeRef | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: Card[];
}

export interface AbilityPage {
  name: string;
  label: string;
  effect: string | null;
  pokemon: Card[];
}

export interface TypePage {
  name: string;
  label: string;
  relations: { label: string; types: TypeRef[] }[];
  pokemon: Card[];
  moves: Option[];
}
