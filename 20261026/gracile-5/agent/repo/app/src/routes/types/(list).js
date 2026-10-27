import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { getTypesPage } from '../../lib/data.js';
import { pageHandler } from '../../lib/page-handler.js';

export default defineRoute({
  handler: pageHandler(() => getTypesPage()),

  document: () => document({ title: 'Types' }),

  template: ({ props: { types } }) => html`
    <h1>Types</h1>
    <ul class="type-grid">
      ${types.map((t) => html`<li><a class="type-${t.name}" href="/types/${t.name}">${t.label}</a></li>`)}
    </ul>
  `,
});
