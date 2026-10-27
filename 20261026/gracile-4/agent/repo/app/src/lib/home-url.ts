export type HomeFilters = { q: string; type: string; generation: string; page: number };

/** URL of the Pokémon list with the given filters, leaving out empty and default values. */
export function homeUrl(filters: HomeFilters) {
	const params = new URLSearchParams();
	if (filters.q) params.set('q', filters.q);
	if (filters.type) params.set('type', filters.type);
	if (filters.generation) params.set('generation', filters.generation);
	if (filters.page > 1) params.set('page', String(filters.page));
	const query = params.toString();
	return query ? `/?${query}` : '/';
}
