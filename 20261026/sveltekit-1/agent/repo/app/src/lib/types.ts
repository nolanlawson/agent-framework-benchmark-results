// Shapes passed from server load functions to pages.

export interface TypeRef {
	name: string;
	label: string;
}

export interface Card {
	id: number;
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
	type: TypeRef;
	category: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

export interface MoveTable {
	method: string;
	label: string;
	rows: MoveRow[];
}

export interface EvolutionNode {
	name: string;
	label: string;
	children: EvolutionNode[];
}
