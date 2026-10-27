// Shapes of the data the server functions hand to the pages.

export interface Named {
  name: string;
  label: string;
}

export interface Card {
  /** Species ID (dex number). */
  id: number;
  /** Species API name. */
  name: string;
  /** Type API names in slot order (home page only). */
  types?: string[];
  hidden?: boolean;
}

export interface PokedexIndex {
  species: { id: number; name: string; types: string[]; generation: string }[];
  types: Named[];
  generations: Named[];
}

export interface EvolutionNode {
  name: string;
  children: EvolutionNode[];
}

export interface PokemonDetail {
  id: number;
  pokemonName: string;
  label: string;
  genus: string | null;
  types: Named[];
  artwork: string | null;
  height: number;
  weight: number;
  flavorText: string | null;
  stats: { name: string; label: string; value: number }[];
  abilities: { name: string; hidden: boolean }[];
  evolution: EvolutionNode | null;
  games: Named[];
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: Named;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface LearnTable {
  method: string;
  label: string;
  rows: MoveRow[];
}

export interface MoveDetail {
  label: string;
  type: Named;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: Card[];
}

export interface AbilityDetail {
  label: string;
  effect: string | null;
  pokemon: Card[];
}

export interface TypeDetail {
  label: string;
  relations: { term: string; types: Named[] }[];
  pokemon: Card[];
  moves: Named[];
}
