import { h } from './dom';
import { dexNumber, humanize, spriteUrl } from './api';

export const EM_DASH = '—';

/** A type badge; a link to the type page unless `link` is false. */
export function typeBadge(type: string, label: string, link = true): HTMLElement {
  const attrs = { class: `type-badge type-badge--${type}` };
  return link ? h('a', { ...attrs, href: `/types/${type}` }, label) : h('span', attrs, label);
}

export interface CardData {
  id: number;
  speciesName: string;
  types?: string[];
  note?: string;
}

/** A Pokémon card: a link to the species page with sprite, dex number and name. */
export function pokemonCard(card: CardData, typeNames?: Map<string, string>): HTMLLIElement {
  return h(
    'li',
    { class: 'card-grid__item' },
    h(
      'a',
      { class: 'card', href: `/pokemon/${card.speciesName}` },
      h('img', {
        class: 'card__sprite',
        src: spriteUrl(card.id),
        alt: '',
        width: 96,
        height: 96,
        loading: 'lazy',
        decoding: 'async',
      }),
      h('span', { class: 'card__number' }, dexNumber(card.id)),
      h('span', { class: 'card__name' }, humanize(card.speciesName)),
      card.types?.length
        ? h(
            'span',
            { class: 'card__types' },
            card.types.map((t) => typeBadge(t, typeNames?.get(t) ?? humanize(t), false)),
          )
        : null,
      card.note ? h('span', { class: 'card__note' }, card.note) : null,
    ),
  );
}

export function cardGrid(cards: CardData[], typeNames?: Map<string, string>): HTMLUListElement {
  return h('ul', { class: 'card-grid' }, cards.map((c) => pokemonCard(c, typeNames)));
}

export function countLine(count: number, noun = 'Pokémon'): HTMLParagraphElement {
  return h('p', { class: 'count' }, `${count} ${noun}`);
}

export function pageTitle(text: string): HTMLHeadingElement {
  return h('h1', { class: 'page-title' }, text);
}
