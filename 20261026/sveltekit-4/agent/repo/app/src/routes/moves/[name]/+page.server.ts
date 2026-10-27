import { error } from '@sveltejs/kit';
import { englishEntry, englishName, get, getTypes, latestFlavorText, pokemonCards, typeRef } from '#lib/server/api.ts';
import { humanize } from '#lib/util.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const move = await get(`move/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!move) error(404, 'Not found');

	const [typeIndex, cards] = await Promise.all([
		getTypes(),
		pokemonCards((move.learned_by_pokemon ?? []).map((pokemon: any) => ({ pokemon })))
	]);

	const shortEffect = englishEntry<any>(move.effect_entries)?.short_effect as string | undefined;
	const effect =
		shortEffect?.replaceAll('$effect_chance', String(move.effect_chance ?? '')).replace(/\s+/g, ' ').trim() ||
		latestFlavorText(move.flavor_text_entries) ||
		null;

	return {
		name: englishName(move),
		type: move.type ? typeRef(typeIndex, move.type.name) : null,
		category: move.damage_class ? humanize(move.damage_class.name) : null,
		power: move.power as number | null,
		accuracy: move.accuracy as number | null,
		pp: move.pp as number | null,
		effect,
		cards
	};
};
