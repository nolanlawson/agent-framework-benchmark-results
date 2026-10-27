import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { getTypeRefs } from '../../lib/data.js';
import { isBuildStep } from '../../lib/api.js';
import { document } from '../../document.js';

export default defineRoute({
	handler: async () => ({ types: isBuildStep() ? [] : await getTypeRefs() }),

	document: (context) => document({ ...context, title: 'Types' }),

	template: ({ props: { types } }) => html`
		<div class="page-heading"><h1>Types</h1></div>

		<ul class="type-grid" role="list">
			${types.map((type) => html`<li><a class="type-tile type-${type.name}" href="/types/${type.name}">${type.label}</a></li>`)}
		</ul>
	`,
});
