export interface CardData {
	id: number;
	/** Species API name. */
	name: string;
	/** Humanized species name. */
	label: string;
	sprite: string;
	/** Types as [API name, English name], shown on the home page only. */
	types?: [string, string][];
	hidden?: boolean;
}

export interface TypeRef {
	name: string;
	label: string;
}

export interface EvolutionNode {
	name: string;
	label: string;
	children: EvolutionNode[];
}
