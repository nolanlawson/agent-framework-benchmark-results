export interface TypeRef {
  name: string
  label: string
}

export interface Card {
  id: number
  name: string
  label: string
  sprite: string
  types?: TypeRef[]
  hidden?: boolean
}

export interface EvolutionNode {
  name: string
  label: string
  children: EvolutionNode[]
}

export interface MoveRow {
  level: number | null
  name: string
  label: string
  type: TypeRef
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
