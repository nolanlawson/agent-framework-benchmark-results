import {
	cardsFor,
	englishShortEffect,
	getOrNotFound,
	lastEnglishFlavorText,
	type EffectEntry,
	type FlavorText,
	type Name,
	type NamedRef
} from '#lib/server/pokeapi.ts';
import { englishName } from '#lib/format.ts';
import type { PageServerLoad } from './$types';

interface Ability {
	name: string;
	names: Name[];
	effect_entries: EffectEntry[];
	flavor_text_entries: FlavorText[];
	pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export const load: PageServerLoad = async ({ params }) => {
	const ability = await getOrNotFound<Ability>(`ability/${encodeURIComponent(params.name.toLowerCase())}`);
	const pokemon = await cardsFor(
		ability.pokemon.map((p) => ({ ...p.pokemon, hidden: p.is_hidden })),
		(ref) => ({ hidden: ref.hidden })
	);

	return {
		title: englishName(ability.names, ability.name),
		effect: englishShortEffect(ability.effect_entries) ?? lastEnglishFlavorText(ability.flavor_text_entries),
		pokemon
	};
};
