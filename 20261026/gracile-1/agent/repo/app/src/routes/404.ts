import { defineRoute } from '@gracile/gracile/route';

import { document } from '../document.js';
import { notFound } from '../templates/partials.js';

export default defineRoute({
	document: () => document({ title: 'Not found' }),
	template: () => notFound(),
});
