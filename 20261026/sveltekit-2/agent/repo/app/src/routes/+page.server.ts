import { allGenerations, speciesIndex, spriteUrl, typeNames } from '#lib/server/pokeapi.ts';
import { englishName } from '#lib/format.ts';
import { PAGE_SIZE, type Filters } from '#lib/filters.ts';
import type { CardData } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const [index, types, generations] = await Promise.all([speciesIndex(), typeNames(), allGenerations()]);

	const filters: Filters = {
		q: url.searchParams.get('q') ?? '',
		type: url.searchParams.get('type') ?? '',
		generation: url.searchParams.get('generation') ?? ''
	};
	const query = filters.q.trim().toLowerCase();

	const matches = index.filter(
		(entry) =>
			(!query || entry.label.toLowerCase().includes(query)) &&
			(!filters.type || entry.types.includes(filters.type)) &&
			(!filters.generation || entry.generation === filters.generation)
	);

	const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const requested = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);

	const cards: CardData[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((entry) => ({
		id: entry.id,
		name: entry.name,
		label: entry.label,
		sprite: spriteUrl(entry.id),
		types: entry.types.map((t) => [t, types.get(t) ?? t])
	}));

	return {
		filters,
		cards,
		count: matches.length,
		page,
		totalPages,
		typeOptions: [...types].map(([name, label]) => ({ name, label })),
		generationOptions: generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) }))
	};
};
