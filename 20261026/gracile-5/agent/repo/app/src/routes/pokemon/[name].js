import '../../components/pokemon-moves.js';

import { defineRoute } from '@gracile/gracile/route';
import { html, nothing } from 'lit';

import { document } from '../../document.js';
import { getPokemonPage } from '../../lib/data.js';
import { dexNumber, humanize, MISSING } from '../../lib/format.js';
import { NOT_FOUND_TITLE, notFoundTemplate } from '../../lib/not-found.js';
import { section, typeBadges } from '../../lib/templates.js';
import { pageHandler } from '../../lib/page-handler.js';

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
};
const MAX_STAT = 255;

const statRow = (label, value, max, className) => html`
  <tr class=${className ?? nothing}>
    <th scope="row">${label}</th>
    <td class="stats__value">${value}</td>
    <td aria-hidden="true">
      <div class="stat-bar"><span style="width: ${Math.min(100, (value / max) * 100).toFixed(1)}%"></span></div>
    </td>
  </tr>
`;

const statsTable = (stats) => {
  const total = stats.reduce((sum, s) => sum + s.value, 0);
  return html`
    <table class="stats">
      <tbody>
        ${stats.map((s) => statRow(STAT_LABELS[s.name] ?? humanize(s.name), s.value, MAX_STAT))}
        ${statRow('Total', total, MAX_STAT * Math.max(stats.length, 1), 'stats__total')}
      </tbody>
    </table>
  `;
};

// Nested lists: each species' evolutions are a list inside its list item.
const evolutionBranches = (nodes) => html`
  <ul>
    ${nodes.map(
      (node) => html`<li>
        <a href="/pokemon/${node.name}">${humanize(node.name)}</a>
        ${node.evolvesTo.length ? evolutionBranches(node.evolvesTo) : nothing}
      </li>`,
    )}
  </ul>
`;

export default defineRoute({
  handler: pageHandler(async ({ params, url, responseInit }) => {
    const pokemon = await getPokemonPage(params.name, url.searchParams.get('game'));
    if (!pokemon) responseInit.status = 404;
    return { pokemon };
  }),

  document: ({ props: { pokemon } }) => document({ title: pokemon ? pokemon.title : NOT_FOUND_TITLE }),

  template: ({ props: { pokemon: p } }) => {
    if (!p) return notFoundTemplate();
    return html`
      <div class="summary">
        ${p.artwork
          ? html`<img class="summary__artwork" src=${p.artwork} alt=${p.title} width="475" height="475" />`
          : nothing}
        <div class="summary__info">
          <p class="summary__dex">${dexNumber(p.id)}</p>
          <h1>${p.title}</h1>
          ${p.genus ? html`<p class="summary__genus">${p.genus}</p>` : nothing}
          ${typeBadges(p.types, { link: true })}
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>${p.height == null ? MISSING : `${(p.height / 10).toFixed(1)} m`}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>${p.weight == null ? MISSING : `${(p.weight / 10).toFixed(1)} kg`}</dd>
            </div>
          </dl>
          ${p.flavorText ? html`<p>${p.flavorText}</p>` : nothing}
        </div>
      </div>

      ${section('stats', 'Base stats', statsTable(p.stats))}
      ${section(
        'abilities',
        'Abilities',
        html`<ul>
          ${p.abilities.map(
            (a) => html`<li>
              <a href="/abilities/${a.name}">${humanize(a.name)}</a>${a.hidden ? ' (hidden)' : nothing}
            </li>`,
          )}
        </ul>`,
      )}
      ${section('evolution', 'Evolution', html`<div class="evolution">${evolutionBranches([p.evolution])}</div>`)}
      ${section(
        'moves',
        'Moves',
        html`<pokemon-moves data=${JSON.stringify(p.moves)} game=${p.moves.selected ?? ''}></pokemon-moves>`,
        { sectionId: 'moves' },
      )}
    `;
  },
});
