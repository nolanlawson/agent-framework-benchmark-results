import { defineRoute } from '@gracile/gracile/route';
import { html } from 'lit';

import { document } from '../../document.js';
import { apiBase } from '../../lib/api.js';
import { getMovePage } from '../../lib/data.js';
import { MISSING, orMissing } from '../../lib/format.js';
import { NOT_FOUND_TITLE, notFoundTemplate } from '../../lib/not-found.js';
import { cardList, countLabel, section, typeBadge } from '../../lib/templates.js';
import { pageHandler } from '../../lib/page-handler.js';

const fact = (term, value) => html`<div><dt>${term}</dt><dd>${value}</dd></div>`;

export default defineRoute({
  handler: pageHandler(async ({ params, responseInit }) => {
    const move = await getMovePage(params.name);
    if (!move) responseInit.status = 404;
    return { move };
  }),

  document: ({ props: { move } }) => document({ title: move ? move.title : NOT_FOUND_TITLE }),

  template: ({ props: { move: m } }) => {
    if (!m) return notFoundTemplate();
    return html`
      <h1>${m.title}</h1>
      <dl class="facts facts--panel">
        ${fact('Type', m.type ? typeBadge(m.type, { link: true }) : MISSING)}
        ${fact('Category', orMissing(m.category))} ${fact('Power', orMissing(m.power))}
        ${fact('Accuracy', orMissing(m.accuracy))} ${fact('PP', orMissing(m.pp))}
      </dl>
      ${section('effect', 'Effect', html`<p>${m.effect ?? MISSING}</p>`)}
      ${section('learned-by', 'Learned by', html`${countLabel(m.pokemon.length)} ${cardList(m.pokemon, apiBase())}`)}
    `;
  },
});
