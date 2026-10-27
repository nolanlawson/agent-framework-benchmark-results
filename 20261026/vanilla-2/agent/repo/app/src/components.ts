import { API_BASE_URL, humanize } from './api';
import { html, SafeHtml } from './html';

export const MISSING = '—';

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const spriteUrl = (id: number) => `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;

export const typeBadge = (name: string, label: string, link = true) =>
  link
    ? html`<a class="type-badge type-${name}" href="/types/${name}">${label}</a>`
    : html`<span class="type-badge type-${name}">${label}</span>`;

export interface CardData {
  id: number;
  name: string; // species API name
  extra?: SafeHtml;
}

export function pokemonCard({ id, name, extra }: CardData): SafeHtml {
  return html`<li class="card">
    <a class="card__link" href="/pokemon/${name}">
      <img class="card__sprite" src="${spriteUrl(id)}" alt="" width="96" height="96" loading="lazy" decoding="async" />
      <span class="card__number">${dexNumber(id)}</span>
      <span class="card__name">${humanize(name)}</span>
      ${extra}
    </a>
  </li>`;
}

export const cardList = (cards: CardData[]) => html`<ul class="card-grid" role="list">${cards.map(pokemonCard)}</ul>`;

export function section(id: string, title: string, body: SafeHtml, attrs = ''): SafeHtml {
  return html`<section class="panel" aria-labelledby="${id}-heading"${new SafeHtml(attrs)}>
    <h2 class="panel__title" id="${id}-heading">${title}</h2>
    ${body}
  </section>`;
}

export const countText = (count: number, noun = 'Pokémon') => html`<p class="count">${count} ${noun}</p>`;
