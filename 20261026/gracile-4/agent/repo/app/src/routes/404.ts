import { defineRoute } from '@gracile/gracile/route';

import { document } from '../document.js';
import { notFound } from '../lib/templates.js';

export default defineRoute({
	document: (context) => document({ ...context, title: 'Not found' }),

	template: () => notFound(),
});
