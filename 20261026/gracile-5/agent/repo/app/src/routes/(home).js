import '../components/pokemon-browser.js';

import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { readFilters } from '../components/pokemon-browser.js';
import { document } from '../document.js';
import { apiBase } from '../lib/api.js';
import { getHomeIndex } from '../lib/data.js';
import { pageHandler } from '../lib/page-handler.js';

export default defineRoute({
  handler: pageHandler(async ({ url }) => ({
    index: await getHomeIndex(),
    filters: readFilters(url.searchParams),
  })),

  document: () => document(),

  template: ({ props: { index, filters } }) => html`
    <h1>Pokémon</h1>
    <pokemon-browser
      api-base=${apiBase()}
      index=${JSON.stringify(index)}
      q=${filters.q}
      type=${filters.type}
      generation=${filters.generation}
      page=${filters.page}
    ></pokemon-browser>
  `,
});
