// Template fragments shared by pages and components (server and browser).
import { html, nothing } from 'lit';

import { dexNumber, humanize, spriteUrl } from './format.js';

export const typeBadge = (type, { link = false } = {}) =>
  link
    ? html`<a class="type-badge type-${type.name}" href="/types/${type.name}">${type.label}</a>`
    : html`<span class="type-badge type-${type.name}">${type.label}</span>`;

export const typeBadges = (types, options) =>
  types.length ? html`<span class="type-badges">${types.map((t) => typeBadge(t, options))}</span>` : nothing;

// card: { id, name, types?, hidden? }
export const pokemonCard = (card, apiBase) => html`
  <li>
    <a class="card" href="/pokemon/${card.name}">
      <img class="card__sprite" src=${spriteUrl(apiBase, card.id)} alt="" width="96" height="96" loading="lazy" />
      <span class="card__dex">${dexNumber(card.id)}</span>
      <span class="card__name">${humanize(card.name)}</span>
      ${card.types ? typeBadges(card.types) : nothing}
      ${card.hidden ? html`<span class="card__note">Hidden ability</span>` : nothing}
    </a>
  </li>
`;

export const cardList = (cards, apiBase) => html`<ul class="card-grid">${cards.map((c) => pokemonCard(c, apiBase))}</ul>`;

export const countLabel = (count, noun = 'Pokémon') => html`<p class="count">${count} ${noun}</p>`;

// A region named by its heading.
export const section = (id, heading, content, { sectionId } = {}) => html`
  <section class="panel" id=${sectionId ?? nothing} aria-labelledby="${id}-heading">
    <h2 id="${id}-heading">${heading}</h2>
    ${content}
  </section>
`;
