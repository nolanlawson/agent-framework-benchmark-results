import { defineRoute } from '@gracile/gracile/route';

import { document } from '../document.js';
import { NOT_FOUND_TITLE, notFoundTemplate } from '../lib/not-found.js';

export default defineRoute({
  document: () => document({ title: NOT_FOUND_TITLE }),
  template: notFoundTemplate,
});
