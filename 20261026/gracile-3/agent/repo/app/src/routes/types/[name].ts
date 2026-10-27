import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { getTypePage } from '../../lib/data.js';
import { isBuildStep } from '../../lib/api.js';
import { document } from '../../document.js';
import { cardList, count, section, typeBadge } from '../../templates/components.js';
import { NOT_FOUND_TITLE, notFound } from '../../templates/not-found.js';

export default defineRoute({
	handler: async ({ params, responseInit }) => {
		if (isBuildStep()) return { type: null };
		const type = await getTypePage(params['name']);
		if (!type) responseInit.status = 404;
		return { type };
	},

	document: (context) => document({ ...context, title: context.props.type?.label ?? NOT_FOUND_TITLE }),

	template: ({ props: { type } }) => {
		if (!type) return notFound();
		return html`
			<div class="page-heading"><h1>${type.label}</h1></div>

			${section(
				'relations',
				'Damage relations',
				html`
					<dl class="relations">
						${type.relations.map(
							(relation) => html`
								<div>
									<dt>${relation.label}</dt>
									<dd>
										${relation.types.length
											? html`<span class="type-list">${relation.types.map((related) => typeBadge(related))}</span>`
											: 'None'}
									</dd>
								</div>
							`,
						)}
					</dl>
				`,
			)}
			${section('pokemon', 'Pokémon', html`${count(type.pokemon.length)} ${cardList(type.pokemon)}`)}
			${section(
				'moves',
				'Moves',
				html`
					${count(type.moves.length, 'moves')}
					<ul class="move-list" role="list">
						${type.moves.map((move) => html`<li><a href="/moves/${move.name}">${move.label}</a></li>`)}
					</ul>
				`,
			)}
		`;
	},
});
