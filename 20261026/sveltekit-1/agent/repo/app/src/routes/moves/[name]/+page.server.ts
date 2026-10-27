import { humanize } from '#lib/format.ts';
import {
	cardsFor,
	cleanText,
	english,
	englishName,
	fetchByName,
	getTypeLabels,
	lastEnglish,
	typeRef,
	type NamedRef
} from '#lib/server/api.ts';
import type { PageServerLoad } from './$types';

interface Move {
	name: string;
	names: { name: string; language: NamedRef }[];
	type: NamedRef;
	damage_class: NamedRef | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect_chance: number | null;
	effect_entries: { short_effect: string; language: NamedRef }[];
	flavor_text_entries: { flavor_text: string; language: NamedRef }[];
	learned_by_pokemon: NamedRef[];
}

export const load: PageServerLoad = async ({ params }) => {
	const move = await fetchByName<Move>('move', params.name);
	const [typeLabels, cards] = await Promise.all([
		getTypeLabels(),
		cardsFor(move.learned_by_pokemon.map((pokemon) => ({ pokemon })))
	]);

	const shortEffect = english(move.effect_entries)?.short_effect;
	const flavor = lastEnglish(move.flavor_text_entries)?.flavor_text;
	const effect = shortEffect
		? shortEffect.replaceAll('$effect_chance', String(move.effect_chance ?? ''))
		: flavor;

	return {
		name: englishName(move.names, move.name),
		type: typeRef(move.type.name, typeLabels),
		category: move.damage_class ? humanize(move.damage_class.name) : null,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect: effect ? cleanText(effect) : null,
		cards
	};
};
