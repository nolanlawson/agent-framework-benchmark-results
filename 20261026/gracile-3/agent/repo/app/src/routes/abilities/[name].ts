import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { getAbilityPage } from '../../lib/data.js';
import { isBuildStep } from '../../lib/api.js';
import { document } from '../../document.js';
import { cardList, count, section } from '../../templates/components.js';
import { NOT_FOUND_TITLE, notFound } from '../../templates/not-found.js';

export default defineRoute({
	handler: async ({ params, responseInit }) => {
		if (isBuildStep()) return { ability: null };
		const ability = await getAbilityPage(params['name']);
		if (!ability) responseInit.status = 404;
		return { ability };
	},

	document: (context) => document({ ...context, title: context.props.ability?.label ?? NOT_FOUND_TITLE }),

	template: ({ props: { ability } }) => {
		if (!ability) return notFound();
		return html`
			<div class="page-heading"><h1>${ability.label}</h1></div>

			${section('effect', 'Effect', html`<p>${ability.effect}</p>`)}
			${section('pokemon', 'Pokémon', html`${count(ability.pokemon.length)} ${cardList(ability.pokemon)}`)}
		`;
	},
});
