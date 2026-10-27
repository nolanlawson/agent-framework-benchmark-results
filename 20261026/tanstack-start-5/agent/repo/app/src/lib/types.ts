export type Option = { name: string; label: string }
export type NamedType = Option

export type Card = {
  id: number
  name: string
  label: string
  sprite: string
  types?: NamedType[]
  hidden?: boolean
}

export type ListPage = {
  total: number
  page: number
  pageCount: number
  items: Card[]
  typeOptions: Option[]
  generationOptions: Option[]
}

export type EvolutionNode = { name: string; label: string; evolvesTo: EvolutionNode[] }

export type MoveRow = {
  level: number
  name: string
  label: string
  type: NamedType
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
}

export type MoveTable = { method: string; label: string; rows: MoveRow[] }

export type PokemonPage = {
  id: number
  name: string
  label: string
  genus: string | null
  types: NamedType[]
  artwork: string | null
  height: number
  weight: number
  flavorText: string | null
  stats: { name: string; value: number }[]
  abilities: { name: string; label: string; hidden: boolean }[]
  evolution: EvolutionNode
  games: Option[]
  game: string | null
  moveTables: MoveTable[]
}

export type MovePage = {
  name: string
  label: string
  type: NamedType | null
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
  effect: string
  learnedBy: Card[]
}

export type AbilityPage = { name: string; label: string; effect: string; pokemon: Card[] }

export type TypePage = {
  name: string
  label: string
  relations: { label: string; types: NamedType[] }[]
  pokemon: Card[]
  moves: Option[]
}
