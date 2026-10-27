export interface TypeRef {
  name: string
  label: string
}

export interface CardData {
  id: number
  name: string
  sprite: string
  types?: TypeRef[]
  hidden?: boolean
}

export interface MoveRow {
  name: string
  label: string
  type: TypeRef | null
  category: string | null
  power: number | null
  accuracy: number | null
  pp: number | null
  level?: number
}

export interface MoveTable {
  method: string
  label: string
  rows: MoveRow[]
}

export interface EvolutionNode {
  name: string
  children: EvolutionNode[]
}
