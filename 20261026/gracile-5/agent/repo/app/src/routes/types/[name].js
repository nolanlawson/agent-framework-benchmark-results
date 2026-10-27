import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { apiBase } from '../../lib/api.js';
import { getTypePage } from '../../lib/data.js';
import { NOT_FOUND_TITLE, notFoundTemplate } from '../../lib/not-found.js';
import { cardList, countLabel, section, typeBadges } from '../../lib/templates.js';
import { pageHandler } from '../../lib/page-handler.js';

export default defineRoute({
  handler: pageHandler(async ({ params, responseInit }) => {
    const type = await getTypePage(params.name);
    if (!type) responseInit.status = 404;
    return { type };
  }),

  document: ({ props: { type } }) => document({ title: type ? type.title : NOT_FOUND_TITLE }),

  template: ({ props: { type: t } }) => {
    if (!t) return notFoundTemplate();
    return html`
      <h1>${t.title}</h1>
      ${section(
        'relations',
        'Damage relations',
        html`<dl class="relations">
          ${t.relations.map(
            (r) => html`<div>
              <dt>${r.label}</dt>
              <dd>${r.types.length ? typeBadges(r.types, { link: true }) : 'None'}</dd>
            </div>`,
          )}
        </dl>`,
      )}
      ${section('pokemon', 'Pokémon', html`${countLabel(t.pokemon.length)} ${cardList(t.pokemon, apiBase())}`)}
      ${section(
        'moves',
        'Moves',
        html`${countLabel(t.moves.length, 'moves')}
          <ul class="move-columns">
            ${t.moves.map((m) => html`<li><a href="/moves/${m.name}">${m.label}</a></li>`)}
          </ul>`,
      )}
    `;
  },
});
