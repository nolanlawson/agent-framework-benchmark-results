// Shapes the server functions return to the UI.

export type TypeRef = { name: string; label: string }

export type CardData = {
  id: number
  /** species API name, used in the URL */
  name: string
  /** humanized species name */
  label: string
  sprite: string
  types?: TypeRef[]
  hidden?: boolean
}

export type Option = { value: string; label: string }

export type PokemonListData = {
  total: number
  page: number
  pages: number
  items: CardData[]
  typeOptions: Option[]
  generationOptions: Option[]
}

export type EvolutionNode = { name: string; label: string; evolvesTo: EvolutionNode[] }

export type MoveRow = {
  name: string
  label: string
  level: number | null
  type: TypeRef
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
}

export type MoveTable = { method: string; label: string; rows: MoveRow[] }

export type PokemonData = {
  id: number
  name: string
  label: string
  genus: string | null
  types: TypeRef[]
  artwork: string | null
  height: number
  weight: number
  flavorText: string | null
  stats: { name: string; label: string; value: number }[]
  abilities: { name: string; label: string; hidden: boolean }[]
  evolution: EvolutionNode | null
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
  learnedBy: CardData[]
}

export type AbilityData = {
  name: string
  label: string
  effect: string | null
  pokemon: CardData[]
}

export type TypeData = {
  name: string
  label: string
  relations: { key: string; label: string; types: TypeRef[] }[]
  pokemon: CardData[]
  moves: Option[]
}
