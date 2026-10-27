export interface TypeRef {
  name: string
  label: string
}

export interface Card {
  id: number
  name: string
  hidden?: boolean
}

export interface IndexEntry {
  id: number
  name: string
  types: string[]
  generation: string | null
}

export interface IndexData {
  species: IndexEntry[]
  types: TypeRef[]
  generations: TypeRef[]
}

export interface EvolutionNode {
  name: string
  children: EvolutionNode[]
}

export interface PokemonData {
  id: number
  name: string
  label: string
  genus: string | null
  types: TypeRef[]
  artwork: string | null
  height: number
  weight: number
  flavor: string | null
  stats: { name: string; label: string; value: number }[]
  abilities: { name: string; hidden: boolean }[]
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

export interface PokemonMovesData {
  games: TypeRef[]
  game: string | null
  tables: MoveTable[]
}

export interface MoveData {
  name: string
  label: string
  type: TypeRef | null
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string | null
  pokemon: Card[]
}

export interface AbilityData {
  name: string
  label: string
  effect: string | null
  pokemon: Card[]
}

export interface TypeData {
  name: string
  label: string
  relations: { key: string; label: string; types: TypeRef[] }[]
  pokemon: Card[]
  moves: { name: string; label: string }[]
}
