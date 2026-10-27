import { humanize } from '#lib/format.ts';
import {
	cardsFor,
	englishName,
	fetchByName,
	getTypeLabels,
	isListedType,
	typeRef,
	type TypeDetail
} from '#lib/server/api.ts';
import { error } from '@sveltejs/kit';
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
	if (!isListedType(params.name)) error(404, 'Not found');
	const type = await fetchByName<TypeDetail>('type', params.name);
	const [typeLabels, cards] = await Promise.all([getTypeLabels(), cardsFor(type.pokemon)]);

	return {
		name: englishName(type.names, type.name),
		relations: RELATIONS.map(([key, label]) => ({
			label,
			types: (type.damage_relations[key] ?? []).map((t) => typeRef(t.name, typeLabels))
		})),
		cards,
		moves: type.moves
			.map((m) => ({ name: m.name, label: humanize(m.name) }))
			.sort((a, b) => a.label.localeCompare(b.label))
	};
};
