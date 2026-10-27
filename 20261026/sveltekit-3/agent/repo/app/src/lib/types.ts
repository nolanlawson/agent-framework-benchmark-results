// View models passed from load functions to components.

export interface TypeTag {
	/** API name, e.g. `fire` */
	name: string;
	/** English name, e.g. `Fire` */
	label: string;
}

export interface PokemonCard {
	/** Species ID (= dex number) */
	id: number;
	/** Species API name, used in the link */
	name: string;
	/** Humanized species name */
	label: string;
	sprite: string;
	/** Only set where the card should show types (the home page) */
	types?: TypeTag[];
	/** Set on ability pages when the ability is hidden for this Pokémon */
	hidden?: boolean;
}

export interface EvolutionNode {
	name: string;
	label: string;
	evolvesTo: EvolutionNode[];
}

export interface MoveRow {
	level: number | null;
	name: string;
	label: string;
	type: TypeTag;
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
