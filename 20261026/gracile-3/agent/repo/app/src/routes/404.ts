import { defineRoute } from '@gracile/gracile/route';

import { document } from '../document.js';
import { NOT_FOUND_TITLE, notFound } from '../templates/not-found.js';

export default defineRoute({
	document: (context) => document({ ...context, title: NOT_FOUND_TITLE }),

	template: () => notFound(),
});
