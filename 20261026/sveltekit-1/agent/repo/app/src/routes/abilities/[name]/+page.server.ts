import {
	cardsFor,
	cleanText,
	english,
	englishName,
	fetchByName,
	lastEnglish,
	type NamedRef,
	type PokemonRef
} from '#lib/server/api.ts';
import type { PageServerLoad } from './$types';

interface Ability {
	name: string;
	names: { name: string; language: NamedRef }[];
	effect_entries: { short_effect: string; language: NamedRef }[];
	flavor_text_entries: { flavor_text: string; language: NamedRef }[];
	pokemon: PokemonRef[];
}

export const load: PageServerLoad = async ({ params }) => {
	const ability = await fetchByName<Ability>('ability', params.name);
	const effect =
		english(ability.effect_entries)?.short_effect ?? lastEnglish(ability.flavor_text_entries)?.flavor_text;

	return {
		name: englishName(ability.names, ability.name),
		effect: effect ? cleanText(effect) : null,
		cards: await cardsFor(ability.pokemon.map((p) => ({ pokemon: p.pokemon, is_hidden: p.is_hidden ?? false })))
	};
};
