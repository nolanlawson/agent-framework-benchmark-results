import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { isBuilding } from '../../lib/api.js';
import { document } from '../../document.js';
import { typePage } from '../../lib/data.js';
import { notFound, pokemonCards, section, typeBadges } from '../../templates/partials.js';

export default defineRoute({
	handler: {
		GET: async ({ params, responseInit }) => {
			if (isBuilding()) return { type: null };
			const type = await typePage(params.name ?? '');
			if (!type) responseInit.status = 404;
			return { type };
		},
	},

	document: ({ props }) => document({ title: props.GET.type?.label ?? 'Not found' }),

	template: ({ props: { GET } }) => {
		const t = GET.type;
		if (!t) return notFound();
		return html`
			<h1>${t.label}</h1>
			${section(
				'damage-relations',
				'Damage relations',
				html`<dl class="relations">
					${t.relations.map(
						(r) => html`<div>
							<dt>${r.label}</dt>
							<dd>${r.types.length ? typeBadges(r.types) : 'None'}</dd>
						</div>`,
					)}
				</dl>`,
			)}
			${section(
				'pokemon',
				'Pokémon',
				html`<p class="count">${t.pokemon.length} Pokémon</p>
					${pokemonCards(t.pokemon)}`,
			)}
			${section(
				'moves',
				'Moves',
				html`<p class="count">${t.moves.length} moves</p>
					<ul class="move-list">
						${t.moves.map((m) => html`<li><a href="/moves/${m.name}">${m.label}</a></li>`)}
					</ul>`,
			)}
		`;
	},
});
