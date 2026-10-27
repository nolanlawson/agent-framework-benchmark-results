import { error } from '@sveltejs/kit';
import { englishName, get, getTypes, pokemonCards, typeRef } from '#lib/server/api.ts';
import { humanize } from '#lib/util.ts';
import type { PageServerLoad } from './$types';

const RELATIONS = [
	['Super effective against', 'double_damage_to'],
	['Not very effective against', 'half_damage_to'],
	['No effect against', 'no_damage_to'],
	['Weak to', 'double_damage_from'],
	['Resists', 'half_damage_from'],
	['Immune to', 'no_damage_from']
] as const;

export const load: PageServerLoad = async ({ params }) => {
	const type = await get(`type/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!type) error(404, 'Not found');

	const [typeIndex, cards] = await Promise.all([getTypes(), pokemonCards(type.pokemon ?? [])]);

	const relations = RELATIONS.map(([label, key]) => ({
		label,
		types: (type.damage_relations?.[key] ?? []).map((t: { name: string }) => typeRef(typeIndex, t.name))
	}));

	const moves = (type.moves ?? [])
		.map((m: { name: string }) => ({ name: m.name, label: humanize(m.name) }))
		.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

	return { name: englishName(type), relations, cards, moves };
};
