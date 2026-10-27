import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { getMovePage } from '../../lib/data.js';
import { orDash } from '../../lib/format.js';
import { isBuildStep } from '../../lib/api.js';
import { document } from '../../document.js';
import { cardList, count, section, typeBadge } from '../../templates/components.js';
import { NOT_FOUND_TITLE, notFound } from '../../templates/not-found.js';

export default defineRoute({
	handler: async ({ params, responseInit }) => {
		if (isBuildStep()) return { move: null };
		const move = await getMovePage(params['name']);
		if (!move) responseInit.status = 404;
		return { move };
	},

	document: (context) => document({ ...context, title: context.props.move?.label ?? NOT_FOUND_TITLE }),

	template: ({ props: { move } }) => {
		if (!move) return notFound();
		return html`
			<div class="page-heading"><h1>${move.label}</h1></div>

			<dl class="facts panel">
				<div><dt>Type</dt><dd>${typeBadge(move.type)}</dd></div>
				<div><dt>Category</dt><dd>${move.category}</dd></div>
				<div><dt>Power</dt><dd>${orDash(move.power)}</dd></div>
				<div><dt>Accuracy</dt><dd>${orDash(move.accuracy)}</dd></div>
				<div><dt>PP</dt><dd>${orDash(move.pp)}</dd></div>
			</dl>

			${section('effect', 'Effect', html`<p>${move.effect}</p>`)}
			${section('learned-by', 'Learned by', html`${count(move.learnedBy.length)} ${cardList(move.learnedBy)}`)}
		`;
	},
});
