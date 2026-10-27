// Filtering and pagination for the Pokémon list. Runs on the server for the first render
// and in the browser while the user changes the filters.

import type { Card, SpeciesIndex } from './types.js';

export const PAGE_SIZE = 48;

export interface BrowseState {
	q: string;
	type: string;
	generation: string;
	page: number;
}

export interface BrowseResult {
	state: BrowseState;
	total: number;
	page: number;
	pageCount: number;
	cards: Card[];
}

export function stateFromParams(params: URLSearchParams): BrowseState {
	const page = Number.parseInt(params.get('page') ?? '', 10);
	return {
		q: params.get('q') ?? '',
		type: params.get('type') ?? '',
		generation: params.get('generation') ?? '',
		page: Number.isFinite(page) && page > 0 ? page : 1,
	};
}

/** Query string for a state, leaving out empty and default values. */
export function stateToSearch(state: BrowseState): string {
	const params = new URLSearchParams();
	if (state.q) params.set('q', state.q);
	if (state.type) params.set('type', state.type);
	if (state.generation) params.set('generation', state.generation);
	if (state.page > 1) params.set('page', String(state.page));
	const search = params.toString();
	return search ? `?${search}` : '';
}

export function browse(index: SpeciesIndex, state: BrowseState): BrowseResult {
	const q = state.q.trim().toLowerCase();
	const matches = index.species.filter(
		(species) =>
			(!q || species.label.toLowerCase().includes(q)) &&
			(!state.type || species.types.includes(state.type)) &&
			(!state.generation || species.generation === state.generation),
	);
	const pageCount = Math.ceil(matches.length / PAGE_SIZE);
	const page = Math.min(Math.max(1, state.page), Math.max(1, pageCount));
	const typeLabels = new Map(index.types.map((type) => [type.name, type.label]));

	return {
		state,
		total: matches.length,
		page,
		pageCount,
		cards: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((species) => ({
			id: species.id,
			name: species.name,
			label: species.label,
			sprite: `${index.spriteBase}/${species.id}.png`,
			types: species.types.map((name) => ({ name, label: typeLabels.get(name) ?? name })),
		})),
	};
}
