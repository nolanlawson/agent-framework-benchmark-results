export interface TypeRef {
  name: string
  label: string
}

export interface PokemonCard {
  id: number
  name: string
  label: string
  sprite: string
  types?: TypeRef[]
  hidden?: boolean
}

export interface CardList {
  count: number
  results: PokemonCard[]
}

export interface SpeciesPage {
  count: number
  page: number
  totalPages: number
  results: PokemonCard[]
}

export interface Meta {
  types: TypeRef[]
  generations: TypeRef[]
}

export interface EvolutionNode {
  name: string
  label: string
  children: EvolutionNode[]
}

export interface PokemonDetail {
  id: number
  name: string
  label: string
  genus: string
  flavorText: string
  artwork: string | null
  height: number
  weight: number
  types: TypeRef[]
  stats: { name: string; label: string; value: number }[]
  abilities: { name: string; label: string; hidden: boolean }[]
  evolution: EvolutionNode | null
}

export interface MoveRow {
  level: number | null
  name: string
  label: string
  type: TypeRef | null
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
}

export interface MoveTable {
  method: string
  label: string
  rows: MoveRow[]
}

export interface PokemonMoves {
  games: TypeRef[]
  selected: string | null
  tables: MoveTable[]
}

export interface MoveDetail {
  name: string
  label: string
  type: TypeRef | null
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string
  learnedBy: CardList
}

export interface AbilityDetail {
  name: string
  label: string
  effect: string
  pokemon: CardList
}

export interface TypeDetail {
  name: string
  label: string
  relations: { key: string; label: string; types: TypeRef[] }[]
  pokemon: CardList
  moves: TypeRef[]
}
