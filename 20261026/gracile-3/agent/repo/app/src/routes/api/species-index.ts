import { defineRoute } from '@gracile/gracile/route';

import { getSpeciesIndex } from '../../lib/data.js';

// The data the Pokémon list filters on, for client-side filtering.
export default defineRoute({
	handler: {
		GET: async () =>
			Response.json(await getSpeciesIndex(), {
				headers: { 'Cache-Control': 'no-cache' },
			}),
	},
});
