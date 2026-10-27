export interface Filters {
	q: string;
	type: string;
	generation: string;
}

export const PAGE_SIZE = 48;

/** Home page URL for the given filters and page, leaving out empty and default values. */
export function listUrl(filters: Filters, page = 1): string {
	const params = new URLSearchParams();
	if (filters.q.trim()) params.set('q', filters.q.trim());
	if (filters.type) params.set('type', filters.type);
	if (filters.generation) params.set('generation', filters.generation);
	if (page > 1) params.set('page', String(page));
	const query = params.toString();
	return query ? `/?${query}` : '/';
}
