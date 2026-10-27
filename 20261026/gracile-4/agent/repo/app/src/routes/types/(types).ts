import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { isBuildRender } from '../../lib/build.js';
import { getTypes } from '../../lib/data.js';

export default defineRoute({
	handler: async ({ url }) => ({
		types: (isBuildRender(url) ? [] : await getTypes()).map((t) => ({ name: t.name, label: t.label })),
	}),

	document: (context) => document({ ...context, title: 'Types' }),

	template: ({ props: { types } }) => html`
		<h1>Types</h1>
		<ul class="type-grid" role="list">
			${types.map(
				(t) => html`
					<li>
						<a class="type-tile" href=${`/types/${t.name}`} style=${`--type-color: var(--type-${t.name})`}>${t.label}</a>
					</li>
				`,
			)}
		</ul>
	`,
});
