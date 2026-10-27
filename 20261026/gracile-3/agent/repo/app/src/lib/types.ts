// View-model types shared by the server and the client.

export interface TypeRef {
	name: string;
	label: string;
}

export interface Card {
	id: number;
	/** Species API name. */
	name: string;
	/** Humanized species name. */
	label: string;
	sprite: string;
	types?: TypeRef[];
	/** Extra line under the name, e.g. `Hidden ability`. */
	note?: string;
}

export interface SpeciesIndexEntry {
	id: number;
	name: string;
	label: string;
	/** Type API names, in slot order. */
	types: string[];
	/** Generation API name. */
	generation: string;
}

/** Everything the home page needs to filter species, on the server or in the browser. */
export interface SpeciesIndex {
	spriteBase: string;
	types: TypeRef[];
	generations: TypeRef[];
	species: SpeciesIndexEntry[];
}
