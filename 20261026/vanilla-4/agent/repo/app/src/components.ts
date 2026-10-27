import { dexNumber, spriteUrl, type SpeciesSummary } from './api';
import { h } from './dom';

export function typeBadge(name: string, label: string, link = true) {
  const cls = `type-badge type-${name}`;
  return link ? h('a', { class: cls, href: `/types/${name}` }, label) : h('span', { class: cls }, label);
}

function sprite(id: number) {
  return h('img', {
    class: 'sprite',
    src: spriteUrl(id),
    alt: '',
    width: 96,
    height: 96,
    loading: 'lazy',
    onerror: ((e: Event) => (e.target as HTMLImageElement).classList.add('missing')) as EventListener,
  });
}

/** A list item holding a Pokémon card. `extra` goes below the name. */
export function pokemonCard(s: SpeciesSummary, extra?: Node | null) {
  return h(
    'li',
    { class: 'pokemon-card' },
    h(
      'a',
      { href: `/pokemon/${s.name}` },
      sprite(s.id),
      h('span', { class: 'dex' }, dexNumber(s.id)),
      h('span', { class: 'name' }, s.label),
    ),
    extra,
  );
}

export const cardList = (items: Node[]) => h('ul', { class: 'card-grid' }, items);

export const countText = (n: number, noun = 'Pokémon') => h('p', { class: 'count' }, `${n} ${noun}`);
