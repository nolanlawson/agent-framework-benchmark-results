import { error, redirect } from '@sveltejs/kit';
import { cardsFor, getAbility } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const ability = await getAbility(params.name.toLowerCase());
	if (!ability) error(404, 'Not found');
	if (params.name !== ability.name) redirect(308, `/abilities/${ability.name}`);

	return {
		label: ability.label,
		effect: ability.effect,
		cards: await cardsFor(ability.pokemon, (p) => (p.hidden ? { hidden: true } : {}))
	};
};
