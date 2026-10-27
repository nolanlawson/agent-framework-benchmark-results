import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { isBuilding } from '../../lib/api.js';
import { document } from '../../document.js';
import { typeRefs } from '../../lib/data.js';

export default defineRoute({
	handler: {
		GET: async () => ({ types: isBuilding() ? [] : await typeRefs() }),
	},

	document: () => document({ title: 'Types' }),

	template: ({ props }) => html`
		<h1>Types</h1>
		<ul class="type-grid">
			${props.GET.types.map((t) => html`<li><a class="t-${t.name}" href="/types/${t.name}">${t.label}</a></li>`)}
		</ul>
	`,
});
