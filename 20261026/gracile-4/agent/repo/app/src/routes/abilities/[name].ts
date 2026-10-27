import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { isBuildRender } from '../../lib/build.js';
import { api } from '../../lib/api.js';
import { pokemonRefsToSpecies } from '../../lib/data.js';
import { EM_DASH, englishName, type Localized, type NamedRef } from '../../lib/format.js';
import { cardList, notFound, section } from '../../lib/templates.js';

type Ability = {
	name: string;
	names: Localized[];
	effect_entries: Array<{ short_effect: string; language: NamedRef }>;
	pokemon: Array<{ is_hidden: boolean; slot: number; pokemon: NamedRef }>;
};

async function loadAbility(name: string) {
	const ability = await api<Ability>(`ability/${encodeURIComponent(name.toLowerCase())}/`);
	if (!ability) return null;
	const pokemon = await pokemonRefsToSpecies(ability.pokemon);
	return {
		label: englishName(ability.names, ability.name),
		effect: ability.effect_entries.find((e) => e.language.name === 'en')?.short_effect ?? EM_DASH,
		pokemon: pokemon.map(({ id, name, label, source }) => ({
			id,
			name,
			label,
			note: source.is_hidden ? 'Hidden ability' : undefined,
		})),
	};
}

export default defineRoute({
	handler: async ({ params, url, responseInit }) => {
		if (isBuildRender(url)) return { data: null };
		const data = await loadAbility(String(params.name ?? ''));
		if (!data) responseInit.status = 404;
		return { data };
	},

	document: (context) => document({ ...context, title: context.props.data?.label ?? 'Not found' }),

	template: ({ props: { data } }) => {
		if (!data) return notFound();
		return html`
			<h1>${data.label}</h1>
			${section('effect', 'Effect', html`<p>${data.effect}</p>`)}
			${section(
				'pokemon',
				'Pokémon',
				html`<p class="count">${data.pokemon.length} Pokémon</p>
					${cardList(data.pokemon)}`,
			)}
		`;
	},
});
