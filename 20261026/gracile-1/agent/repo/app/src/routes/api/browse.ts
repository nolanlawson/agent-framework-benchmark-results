import { defineRoute } from '@gracile/gracile/route';

import { browse } from '../../lib/data.js';
import { parseBrowseState } from '../../lib/format.js';

export default defineRoute({
	handler: {
		GET: async ({ url }) =>
			Response.json(await browse(parseBrowseState(url.searchParams)), {
				headers: { 'cache-control': 'no-store' },
			}),
	},
});
