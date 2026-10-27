import { getGenerations, getMainTypes, getPokemonIndex, spriteUrl, typeTag } from '#lib/server/pokedex.ts';
import type { PokemonCard } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 48;

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const type = url.searchParams.get('type') ?? '';
	const generation = url.searchParams.get('generation') ?? '';
	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);

	const [index, types, generations] = await Promise.all([
		getPokemonIndex(),
		getMainTypes(),
		getGenerations()
	]);
	const typeLabels = new Map(types.map((t) => [t.name, t.label]));

	const needle = q.toLowerCase();
	const matches = index.filter(
		(p) =>
			(!needle || p.label.toLowerCase().includes(needle)) &&
			(!type || p.types.includes(type)) &&
			(!generation || p.generation === generation)
	);

	const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const page = Math.min(Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1), totalPages);
	const cards: PokemonCard[] = matches
		.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
		.map((p) => ({
			id: p.id,
			name: p.name,
			label: p.label,
			sprite: spriteUrl(p.id),
			types: p.types.map((t) => typeTag(t, typeLabels))
		}));

	return {
		filters: { q, type, generation },
		types: types.map((t) => ({ name: t.name, label: t.label })),
		generations: generations.map((g) => ({ name: g.name, label: g.label })),
		total: matches.length,
		page,
		totalPages,
		cards
	};
};
