import { error, redirect } from '@sveltejs/kit';
import { humanize } from '#lib/format.ts';
import { cardsFor, getType, getTypeLabels, typeTag } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

const RELATIONS = [
	['double_damage_to', 'Super effective against'],
	['half_damage_to', 'Not very effective against'],
	['no_damage_to', 'No effect against'],
	['double_damage_from', 'Weak to'],
	['half_damage_from', 'Resists'],
	['no_damage_from', 'Immune to']
] as const;

export const load: PageServerLoad = async ({ params }) => {
	const type = await getType(params.name.toLowerCase());
	if (!type) error(404, 'Not found');
	if (params.name !== type.name) redirect(308, `/types/${type.name}`);

	const [typeLabels, cards] = await Promise.all([getTypeLabels(), cardsFor(type.pokemon)]);

	return {
		label: type.label,
		relations: RELATIONS.map(([key, label]) => ({
			key,
			label,
			types: (type.damageRelations[key] ?? []).map((name) => typeTag(name, typeLabels))
		})),
		cards,
		moves: type.moves
			.map((name) => ({ name, label: humanize(name) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	};
};
