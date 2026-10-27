import {
	cardsFor,
	englishShortEffect,
	getOrNotFound,
	lastEnglishFlavorText,
	typeNames,
	type EffectEntry,
	type FlavorText,
	type Name,
	type NamedRef
} from '#lib/server/pokeapi.ts';
import { englishName, humanize } from '#lib/format.ts';
import type { PageServerLoad } from './$types';

interface Move {
	name: string;
	names: Name[];
	type: NamedRef;
	damage_class: NamedRef | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect_chance: number | null;
	effect_entries: EffectEntry[];
	flavor_text_entries: FlavorText[];
	learned_by_pokemon: NamedRef[];
}

export const load: PageServerLoad = async ({ params }) => {
	const move = await getOrNotFound<Move>(`move/${encodeURIComponent(params.name.toLowerCase())}`);
	const [types, learnedBy] = await Promise.all([typeNames(), cardsFor(move.learned_by_pokemon)]);

	return {
		title: englishName(move.names, move.name),
		type: { name: move.type.name, label: types.get(move.type.name) ?? humanize(move.type.name) },
		category: move.damage_class ? humanize(move.damage_class.name) : null,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect:
			englishShortEffect(move.effect_entries, move.effect_chance) ?? lastEnglishFlavorText(move.flavor_text_entries),
		learnedBy
	};
};
