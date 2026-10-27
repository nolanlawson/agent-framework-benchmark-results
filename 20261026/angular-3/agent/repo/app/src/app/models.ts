// View models returned by the app's /data/* endpoints (see src/server/pokedex-data.ts).

export interface NamedLabel {
  name: string;
  label: string;
}

export interface NotFound {
  notFound: true;
}

export interface CardData {
  id: number;
  name: string;
  label: string;
  hidden?: boolean;
}

export interface IndexEntry extends CardData {
  types: string[];
  generation: string;
}

export interface IndexData {
  notFound?: false;
  spriteBase: string;
  types: NamedLabel[];
  generations: NamedLabel[];
  pokemon: IndexEntry[];
}

export interface StatRow {
  label: string;
  value: number;
}

export interface AbilityRef extends NamedLabel {
  hidden: boolean;
}

export interface EvolutionNode extends NamedLabel {
  children: EvolutionNode[];
}

export interface MoveSummary extends NamedLabel {
  type: NamedLabel;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface LearnRow {
  level: number | null;
  move: MoveSummary;
}

export interface LearnMethod extends NamedLabel {
  rows: LearnRow[];
}

export interface PokemonData {
  notFound?: false;
  id: number;
  name: string;
  label: string;
  genus: string | null;
  types: NamedLabel[];
  artwork: string | null;
  height: string;
  weight: string;
  flavorText: string | null;
  stats: StatRow[];
  abilities: AbilityRef[];
  evolution: EvolutionNode | null;
  games: NamedLabel[];
  game: string | null;
  methods: LearnMethod[];
}

export interface MoveData {
  notFound?: false;
  name: string;
  label: string;
  type: NamedLabel;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  spriteBase: string;
  learnedBy: CardData[];
}

export interface AbilityData {
  notFound?: false;
  name: string;
  label: string;
  effect: string | null;
  spriteBase: string;
  pokemon: CardData[];
}

export interface TypeRelation {
  label: string;
  types: NamedLabel[];
}

export interface TypeData {
  notFound?: false;
  name: string;
  label: string;
  relations: TypeRelation[];
  spriteBase: string;
  pokemon: CardData[];
  moves: NamedLabel[];
}

export interface TypeListData {
  notFound?: false;
  types: NamedLabel[];
}

export type Loaded<T> = T | NotFound;
