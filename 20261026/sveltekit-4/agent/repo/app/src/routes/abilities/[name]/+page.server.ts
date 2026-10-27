import { error } from '@sveltejs/kit';
import { englishEntry, englishName, get, latestFlavorText, pokemonCards } from '#lib/server/api.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const ability = await get(`ability/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!ability) error(404, 'Not found');

	const cards = await pokemonCards(ability.pokemon ?? [], (entry: any) => ({ hidden: Boolean(entry.is_hidden) }));
	const shortEffect = englishEntry<any>(ability.effect_entries)?.short_effect as string | undefined;

	return {
		name: englishName(ability),
		effect: shortEffect?.replace(/\s+/g, ' ').trim() || latestFlavorText(ability.flavor_text_entries) || null,
		cards
	};
};
