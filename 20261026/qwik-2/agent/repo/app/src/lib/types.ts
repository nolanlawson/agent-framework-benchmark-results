// Shapes of the data the route loaders hand to components.

export interface TypeRef {
  name: string;
  label: string;
}

export interface Card {
  id: number;
  /** Species API name, used for the link. */
  name: string;
  label: string;
  sprite: string;
  types?: TypeRef[];
  hidden?: boolean;
}

export interface MoveRow {
  level: number | null;
  name: string;
  label: string;
  type: TypeRef | null;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
}

export interface MoveTableData {
  method: string;
  label: string;
  rows: MoveRow[];
}

export interface EvolutionNode {
  name: string;
  label: string;
  children: EvolutionNode[];
}
