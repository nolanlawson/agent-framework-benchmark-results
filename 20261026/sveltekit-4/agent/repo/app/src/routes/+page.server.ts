import { getGenerations, getSpecies, getTypes, spriteUrl, typeRef } from '#lib/server/api.ts';
import type { Card } from '#lib/util.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 48;

export const load: PageServerLoad = async ({ url }) => {
	const [species, typeIndex, generations] = await Promise.all([getSpecies(), getTypes(), getGenerations()]);

	const q = url.searchParams.get('q')?.trim() ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const generationParam = url.searchParams.get('generation') ?? '';
	const type = typeIndex.labels.has(typeParam) ? typeParam : '';
	const generation = generations.find((g) => g.name === generationParam);

	const needle = q.toLowerCase();
	const matches = species.list.filter(
		(s) =>
			(!needle || s.label.toLowerCase().includes(needle)) &&
			(!type || typeIndex.byPokemon.get(s.id)?.includes(type)) &&
			(!generation || generation.species.has(s.id))
	);

	const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const requested = parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), pageCount);

	const cards: Card[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
		id: s.id,
		name: s.name,
		label: s.label,
		sprite: spriteUrl(s.id),
		types: (typeIndex.byPokemon.get(s.id) ?? []).map((t) => typeRef(typeIndex, t))
	}));

	return {
		q,
		type,
		generation: generation?.name ?? '',
		page,
		pageCount,
		total: matches.length,
		cards,
		types: typeIndex.types.map(({ name, label }) => ({ name, label })),
		generations: generations.map(({ name, label }) => ({ name, label }))
	};
};
