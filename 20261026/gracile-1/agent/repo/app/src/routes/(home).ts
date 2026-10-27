import '../components/pokedex-browser.js';

import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { isBuilding } from '../lib/api.js';
import { document } from '../document.js';
import { browse, browseOptions } from '../lib/data.js';
import { parseBrowseState } from '../lib/format.js';

export default defineRoute({
	handler: {
		GET: async ({ url }) => {
			if (isBuilding()) return { state: parseBrowseState(url.searchParams), result: { count: 0, page: 1, totalPages: 1, items: [] }, options: { types: [], generations: [] } };
			const state = parseBrowseState(url.searchParams);
			const [result, options] = await Promise.all([browse(state), browseOptions()]);
			return { state: { ...state, page: result.page }, result, options };
		},
	},

	document: () => document({ title: null }),

	template: ({ props }) => html`
		<h1>Pokémon</h1>
		<pokedex-browser
			state=${JSON.stringify(props.GET.state)}
			result=${JSON.stringify(props.GET.result)}
			options=${JSON.stringify(props.GET.options)}
		></pokedex-browser>
	`,
});
