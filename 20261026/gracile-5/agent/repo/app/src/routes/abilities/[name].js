import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { apiBase } from '../../lib/api.js';
import { getAbilityPage } from '../../lib/data.js';
import { MISSING } from '../../lib/format.js';
import { NOT_FOUND_TITLE, notFoundTemplate } from '../../lib/not-found.js';
import { cardList, countLabel, section } from '../../lib/templates.js';
import { pageHandler } from '../../lib/page-handler.js';

export default defineRoute({
  handler: pageHandler(async ({ params, responseInit }) => {
    const ability = await getAbilityPage(params.name);
    if (!ability) responseInit.status = 404;
    return { ability };
  }),

  document: ({ props: { ability } }) => document({ title: ability ? ability.title : NOT_FOUND_TITLE }),

  template: ({ props: { ability: a } }) => {
    if (!a) return notFoundTemplate();
    return html`
      <h1>${a.title}</h1>
      ${section('effect', 'Effect', html`<p>${a.effect ?? MISSING}</p>`)}
      ${section('pokemon', 'Pokémon', html`${countLabel(a.pokemon.length)} ${cardList(a.pokemon, apiBase())}`)}
    `;
  },
});
