// Formatting helpers shared by the server routes and the client components.

/** `mr-mime` → `Mr Mime` */
export function humanize(name: string): string {
	return name
		.split('-')
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

/** `25` → `#0025` */
export function dexNumber(id: number): string {
	return `#${String(id).padStart(4, '0')}`;
}

export const DASH = '—';

export function orDash(value: string | number | null | undefined): string {
	return value === null || value === undefined || value === '' ? DASH : String(value);
}

export interface TypeRef {
	name: string;
	label: string;
}

export interface CardItem {
	id: number;
	name: string;
	label: string;
	sprite: string;
	types?: TypeRef[];
	hidden?: boolean;
}

export interface BrowseState {
	q: string;
	type: string;
	generation: string;
	page: number;
}

export interface BrowseResult {
	count: number;
	page: number;
	totalPages: number;
	items: CardItem[];
}

export interface BrowseOptions {
	types: TypeRef[];
	generations: TypeRef[];
}

export const PAGE_SIZE = 48;

export function parseBrowseState(params: URLSearchParams): BrowseState {
	const page = Number.parseInt(params.get('page') ?? '1', 10);
	return {
		q: params.get('q') ?? '',
		type: params.get('type') ?? '',
		generation: params.get('generation') ?? '',
		page: Number.isFinite(page) && page > 0 ? page : 1,
	};
}

/** Query string for a browse state, leaving out empty and default values. */
export function browseQuery(state: BrowseState): string {
	const params = new URLSearchParams();
	if (state.q) params.set('q', state.q);
	if (state.type) params.set('type', state.type);
	if (state.generation) params.set('generation', state.generation);
	if (state.page > 1) params.set('page', String(state.page));
	const query = params.toString();
	return query ? `?${query}` : '';
}
