export interface NamedLabel {
  name: string;
  label: string;
}

export interface Card {
  id: number;
  name: string;
  label: string;
  sprite: string;
  types?: NamedLabel[];
  hidden?: boolean;
}

export interface FilterOptions {
  types: NamedLabel[];
  generations: NamedLabel[];
}

export interface PokemonListPage {
  total: number;
  page: number;
  totalPages: number;
  items: Card[];
}

export interface EvolutionNode {
  name: string;
  label: string;
  children: EvolutionNode[];
}

export interface PokemonDetail {
  id: number;
  name: string;
  label: string;
  genus: string | null;
  types: NamedLabel[];
  artwork: string | null;
  height: number;
  weight: number;
  flavorText: string | null;
  stats: { name: string; label: string; value: number }[];
  abilities: { name: string; label: string; hidden: boolean }[];
  evolution: EvolutionNode;
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: NamedLabel | null;
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

export interface PokemonMoves {
  games: NamedLabel[];
  selected: string | null;
  tables: MoveTable[];
}

export interface MoveDetail {
  name: string;
  label: string;
  type: NamedLabel | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: Card[];
}

export interface AbilityDetail {
  name: string;
  label: string;
  effect: string | null;
  pokemon: Card[];
}

export interface TypeDetail {
  name: string;
  label: string;
  relations: { term: string; types: NamedLabel[] }[];
  pokemon: Card[];
  moves: NamedLabel[];
}
