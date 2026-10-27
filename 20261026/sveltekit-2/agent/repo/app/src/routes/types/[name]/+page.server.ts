import { error } from '@sveltejs/kit';
import { cardsFor, getOrNotFound, typeNames, type TypeData } from '#lib/server/pokeapi.ts';
import { englishName, humanize, isExcludedType } from '#lib/format.ts';
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
	if (isExcludedType(params.name)) error(404, 'Not found');
	const [type, names] = await Promise.all([
		getOrNotFound<TypeData>(`type/${encodeURIComponent(params.name.toLowerCase())}`),
		typeNames()
	]);
	const label = (name: string) => names.get(name) ?? humanize(name);

	return {
		name: type.name,
		title: englishName(type.names, type.name),
		relations: RELATIONS.map(([term, key]) => ({
			term,
			types: (type.damage_relations[key] ?? []).map((t) => ({ name: t.name, label: label(t.name) }))
		})),
		pokemon: await cardsFor(type.pokemon.map((p) => p.pokemon)),
		moves: type.moves
			.map((m) => ({ name: m.name, label: humanize(m.name) }))
			.sort((a, b) => a.name.localeCompare(b.name))
	};
};
