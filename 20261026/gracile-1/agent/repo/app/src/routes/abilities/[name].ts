import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { isBuilding } from '../../lib/api.js';
import { document } from '../../document.js';
import { abilityPage } from '../../lib/data.js';
import { orDash } from '../../lib/format.js';
import { notFound, pokemonCards, section } from '../../templates/partials.js';

export default defineRoute({
	handler: {
		GET: async ({ params, responseInit }) => {
			if (isBuilding()) return { ability: null };
			const ability = await abilityPage(params.name ?? '');
			if (!ability) responseInit.status = 404;
			return { ability };
		},
	},

	document: ({ props }) => document({ title: props.GET.ability?.label ?? 'Not found' }),

	template: ({ props: { GET } }) => {
		const a = GET.ability;
		if (!a) return notFound();
		return html`
			<h1>${a.label}</h1>
			${section('effect', 'Effect', html`<p>${orDash(a.effect)}</p>`)}
			${section(
				'pokemon',
				'Pokémon',
				html`<p class="count">${a.pokemon.length} Pokémon</p>
					${pokemonCards(a.pokemon)}`,
			)}
		`;
	},
});
