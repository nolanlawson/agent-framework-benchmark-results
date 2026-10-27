import { humanize } from '#lib/format.ts';
import {
	englishName,
	getGenerations,
	getSpeciesNames,
	getTypes,
	idFromUrl,
	spriteUrl,
	typeRef
} from '#lib/server/api.ts';
import type { Card } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 48;

export const load: PageServerLoad = async ({ url }) => {
	const [species, types, generations] = await Promise.all([
		getSpeciesNames(),
		getTypes(),
		getGenerations()
	]);

	const q = url.searchParams.get('q') ?? '';
	const typeParam = url.searchParams.get('type') ?? '';
	const generationParam = url.searchParams.get('generation') ?? '';
	const type = types.some((t) => t.name === typeParam) ? typeParam : '';
	const generation = generations.some((g) => g.name === generationParam) ? generationParam : '';

	const typeLabels = new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));

	// A species' default Pokémon has the species' ID; collect its types in slot order.
	const typesById = new Map<number, { slot: number; name: string }[]>();
	for (const t of types) {
		for (const { slot, pokemon } of t.pokemon) {
			const id = idFromUrl(pokemon.url);
			if (!species.has(id)) continue;
			let list = typesById.get(id);
			if (!list) typesById.set(id, (list = []));
			list.push({ slot, name: t.name });
		}
	}

	const generationSpecies = generation
		? new Set(generations.find((g) => g.name === generation)!.pokemon_species.map((s) => idFromUrl(s.url)))
		: null;

	const needle = q.trim().toLowerCase();
	const matches: Card[] = [];
	for (const [id, name] of [...species].sort((a, b) => a[0] - b[0])) {
		const label = humanize(name);
		if (needle && !label.toLowerCase().includes(needle)) continue;
		const slots = typesById.get(id) ?? [];
		if (type && !slots.some((s) => s.name === type)) continue;
		if (generationSpecies && !generationSpecies.has(id)) continue;
		matches.push({
			id,
			name,
			label,
			sprite: spriteUrl(id),
			types: slots.sort((a, b) => a.slot - b.slot).map((s) => typeRef(s.name, typeLabels))
		});
	}

	const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const requested = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), totalPages) : 1;

	return {
		q,
		type,
		generation,
		page,
		totalPages,
		count: matches.length,
		cards: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
		typeOptions: types.map((t) => typeRef(t.name, typeLabels)),
		generationOptions: generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) }))
	};
};
