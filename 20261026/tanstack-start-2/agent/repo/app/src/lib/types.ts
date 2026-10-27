export type TypeRef = { name: string; label: string }

export type Card = {
  id: number
  name: string
  label: string
  sprite: string
  types?: TypeRef[]
  hidden?: boolean
}

export type Option = { name: string; label: string }

export type HomeData = {
  types: Option[]
  generations: Option[]
  count: number
  page: number
  totalPages: number
  items: Card[]
}

export type MoveSummary = {
  name: string
  label: string
  type: TypeRef
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
}

export type MoveRow = MoveSummary & { level: number | null }

export type MoveTable = { method: string; label: string; rows: MoveRow[] }

export type EvolutionNode = { name: string; label: string; children: EvolutionNode[] }

export type PokemonData = {
  id: number
  name: string
  label: string
  genus: string | null
  types: TypeRef[]
  artwork: string | null
  height: string
  weight: string
  flavorText: string | null
  stats: { label: string; value: number }[]
  abilities: { name: string; label: string; hidden: boolean }[]
  evolution: EvolutionNode
  games: Option[]
  game: string | null
  moveTables: MoveTable[]
}

export type MoveData = {
  name: string
  label: string
  type: TypeRef
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string | null
  learnedBy: Card[]
}

export type AbilityData = { name: string; label: string; effect: string | null; pokemon: Card[] }

export type TypeData = {
  name: string
  label: string
  relations: { label: string; types: TypeRef[] }[]
  pokemon: Card[]
  moves: Option[]
}
