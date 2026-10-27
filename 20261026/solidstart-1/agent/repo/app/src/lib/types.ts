export type Ref = { name: string; label: string };

export type Card = {
  id: number;
  name: string;
  label: string;
  sprite: string;
  types?: Ref[];
  hidden?: boolean;
};

export type HomeFilters = { q: string; type: string; generation: string; page: number };

export type HomeData = {
  types: Ref[];
  generations: Ref[];
  count: number;
  page: number;
  totalPages: number;
  cards: Card[];
};

export type EvolutionNode = { name: string; label: string; children: EvolutionNode[] };

export type PokemonData = {
  id: number;
  name: string;
  title: string;
  genus: string | null;
  types: Ref[];
  artwork: string | null;
  height: string;
  weight: string;
  flavor: string | null;
  stats: { label: string; value: number }[];
  total: number;
  abilities: (Ref & { hidden: boolean })[];
  evolution: EvolutionNode | null;
};

export type MoveRow = {
  level: number | null;
  name: string;
  label: string;
  type: Ref | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
};

export type MoveTable = { method: string; label: string; rows: MoveRow[] };

export type PokemonMovesData = { games: Ref[]; selected: string | null; tables: MoveTable[] };

export type MoveData = {
  name: string;
  title: string;
  type: Ref | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: Card[];
};

export type AbilityData = { name: string; title: string; effect: string | null; pokemon: Card[] };

export type TypeData = {
  name: string;
  title: string;
  relations: { label: string; types: Ref[] }[];
  pokemon: Card[];
  moves: Ref[];
};
