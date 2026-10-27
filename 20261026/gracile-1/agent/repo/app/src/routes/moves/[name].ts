import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { isBuilding } from '../../lib/api.js';
import { document } from '../../document.js';
import { movePage } from '../../lib/data.js';
import { orDash } from '../../lib/format.js';
import { notFound, pokemonCards, section, typeBadge } from '../../templates/partials.js';

export default defineRoute({
	handler: {
		GET: async ({ params, responseInit }) => {
			if (isBuilding()) return { move: null };
			const move = await movePage(params.name ?? '');
			if (!move) responseInit.status = 404;
			return { move };
		},
	},

	document: ({ props }) => document({ title: props.GET.move?.label ?? 'Not found' }),

	template: ({ props: { GET } }) => {
		const m = GET.move;
		if (!m) return notFound();
		return html`
			<h1>${m.label}</h1>
			<div class="panel move-facts">
				<dl class="facts">
					<div><dt>Type</dt><dd>${typeBadge(m.type)}</dd></div>
					<div><dt>Category</dt><dd>${orDash(m.category)}</dd></div>
					<div><dt>Power</dt><dd>${orDash(m.power)}</dd></div>
					<div><dt>Accuracy</dt><dd>${orDash(m.accuracy)}</dd></div>
					<div><dt>PP</dt><dd>${orDash(m.pp)}</dd></div>
				</dl>
			</div>
			${section('effect', 'Effect', html`<p>${orDash(m.effect)}</p>`)}
			${section(
				'learned-by',
				'Learned by',
				html`<p class="count">${m.learnedBy.length} Pokémon</p>
					${pokemonCards(m.learnedBy)}`,
			)}
		`;
	},
});
