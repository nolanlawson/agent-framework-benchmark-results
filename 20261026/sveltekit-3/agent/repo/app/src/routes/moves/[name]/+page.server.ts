import { error, redirect } from '@sveltejs/kit';
import { humanize } from '#lib/format.ts';
import { cardsFor, getMove, getTypeLabels, typeTag } from '#lib/server/pokedex.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const move = await getMove(params.name.toLowerCase());
	if (!move) error(404, 'Not found');
	if (params.name !== move.name) redirect(308, `/moves/${move.name}`);

	const [typeLabels, cards] = await Promise.all([
		getTypeLabels(),
		cardsFor(move.learnedBy.map((id) => ({ id })))
	]);

	return {
		label: move.label,
		type: typeTag(move.type, typeLabels),
		category: move.damageClass ? humanize(move.damageClass) : null,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect: move.effect,
		cards
	};
};
