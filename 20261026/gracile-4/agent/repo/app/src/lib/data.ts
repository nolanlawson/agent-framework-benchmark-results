// Domain-level data loading, built on the raw API client.

import { api, apiPath, apiRequired, idFromUrl } from './api.js';
import { englishName, humanize, type Localized, type NamedRef } from './format.js';

type ListResponse = { count: number; results: NamedRef[] };

/** Alternate forms (Mega Evolutions, regional forms…) have IDs above 10000. */
export const isDefaultPokemonId = (id: number) => id > 0 && id < 10000;

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// MARK: Species

export type SpeciesRef = { id: number; name: string; label: string };

/** Every species the API lists, by ID. */
export async function getSpeciesById(): Promise<Map<number, SpeciesRef>> {
	const list = await apiRequired<ListResponse>('pokemon-species/?limit=100000');
	const byId = new Map<number, SpeciesRef>();
	for (const { name, url } of list.results) {
		const id = idFromUrl(url);
		byId.set(id, { id, name, label: humanize(name) });
	}
	return byId;
}

/**
 * Turns Pokémon references (as used by types, moves and abilities) into species
 * references, leaving out alternate forms. Sorted by dex number.
 */
export async function pokemonRefsToSpecies<T extends { pokemon: NamedRef }>(
	refs: T[],
): Promise<Array<SpeciesRef & { source: T }>> {
	const species = await getSpeciesById();
	const seen = new Set<number>();
	const out: Array<SpeciesRef & { source: T }> = [];
	for (const ref of refs) {
		const id = idFromUrl(ref.pokemon.url);
		if (!isDefaultPokemonId(id) || seen.has(id)) continue;
		seen.add(id);
		const s = species.get(id) ?? { id, name: ref.pokemon.name, label: humanize(ref.pokemon.name) };
		out.push({ ...s, source: ref });
	}
	return out.sort((a, b) => a.id - b.id);
}

// MARK: Types

export type TypeDetail = {
	id: number;
	name: string;
	names: Localized[];
	damage_relations: Record<
		| 'double_damage_to'
		| 'half_damage_to'
		| 'no_damage_to'
		| 'double_damage_from'
		| 'half_damage_from'
		| 'no_damage_from',
		NamedRef[]
	>;
	pokemon: Array<{ slot: number; pokemon: NamedRef }>;
	moves: NamedRef[];
};

export type TypeInfo = { name: string; label: string; detail: TypeDetail };

/** The 18 types, in API order, with their details. */
export async function getTypes(): Promise<TypeInfo[]> {
	const list = await apiRequired<ListResponse>('type/?limit=1000');
	const refs = list.results.filter((t) => !EXCLUDED_TYPES.has(t.name));
	const details = await Promise.all(refs.map((t) => apiRequired<TypeDetail>(apiPath(t.url))));
	return details.map((detail) => ({
		name: detail.name,
		label: englishName(detail.names, detail.name),
		detail,
	}));
}

/** English names of all types, keyed by API name. */
export async function getTypeLabels(): Promise<Map<string, string>> {
	return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

export const typeLabel = (labels: Map<string, string>, name: string) =>
	labels.get(name) ?? humanize(name);

// MARK: Generations

type GenerationDetail = { name: string; names: Localized[]; pokemon_species: NamedRef[] };

export type GenerationInfo = { name: string; label: string; speciesIds: Set<number> };

export async function getGenerations(): Promise<GenerationInfo[]> {
	const list = await apiRequired<ListResponse>('generation/?limit=1000');
	const details = await Promise.all(
		list.results.map((g) => apiRequired<GenerationDetail>(apiPath(g.url))),
	);
	return details.map((g) => ({
		name: g.name,
		label: englishName(g.names, g.name),
		speciesIds: new Set(g.pokemon_species.map((s) => idFromUrl(s.url))),
	}));
}

// MARK: Pokémon index (home page)

export type IndexEntry = SpeciesRef & { types: string[]; generation: string | null };

export async function getPokemonIndex(): Promise<{
	entries: IndexEntry[];
	types: TypeInfo[];
	generations: GenerationInfo[];
}> {
	const [species, types, generations] = await Promise.all([
		getSpeciesById(),
		getTypes(),
		getGenerations(),
	]);

	const typeSlots = new Map<number, Array<{ slot: number; type: string }>>();
	for (const type of types) {
		for (const { slot, pokemon } of type.detail.pokemon) {
			const id = idFromUrl(pokemon.url);
			if (!isDefaultPokemonId(id)) continue;
			const slots = typeSlots.get(id) ?? [];
			slots.push({ slot, type: type.name });
			typeSlots.set(id, slots);
		}
	}

	const generationOf = new Map<number, string>();
	for (const g of generations) for (const id of g.speciesIds) generationOf.set(id, g.name);

	const entries = [...species.values()]
		.filter((s) => isDefaultPokemonId(s.id))
		.sort((a, b) => a.id - b.id)
		.map((s) => ({
			...s,
			types: (typeSlots.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
			generation: generationOf.get(s.id) ?? null,
		}));

	return { entries, types, generations };
}

// MARK: Version groups

type VersionGroupDetail = { name: string; order: number };

export async function getVersionGroupOrders(names: string[]): Promise<Map<string, number>> {
	const details = await Promise.all(
		names.map((name) => api<VersionGroupDetail>(`version-group/${encodeURIComponent(name)}/`)),
	);
	return new Map(names.map((name, i) => [name, details[i]?.order ?? Number.MAX_SAFE_INTEGER]));
}
