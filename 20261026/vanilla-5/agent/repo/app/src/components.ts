import { h, type Child } from './dom';
import { MAX_SPECIES_ID, spriteUrl, type Named, type SpeciesRef } from './api';
import { dexNumber, humanize, idFromUrl } from './format';

export interface Page {
  title: string;
  content: Child;
  /** Called once the content is in the document. */
  mounted?: () => void;
}

/** A region named by its heading. */
export function section(title: string, options: { id?: string; className?: string }, ...children: Child[]): HTMLElement {
  const slug = options.id ?? title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-');
  const headingId = `${slug}-heading`;
  return h(
    'section',
    { id: options.id, class: ['panel', options.className].filter(Boolean).join(' '), 'aria-labelledby': headingId },
    h('h2', { id: headingId, class: 'panel-title' }, title),
    ...children,
  );
}

export function typeBadge(type: string, label: string, link = true): HTMLElement {
  const attrs = { class: `type-badge type-${type}` };
  return link ? h('a', { ...attrs, href: `/types/${type}` }, label) : h('span', attrs, label);
}

export function typeBadges(types: { name: string; label: string }[], link = true): HTMLElement {
  return h('span', { class: 'type-badges' }, types.map((t) => typeBadge(t.name, t.label, link)));
}

export function count(n: number, noun = 'Pokémon'): HTMLElement {
  return h('p', { class: 'count' }, `${n} ${noun}`);
}

export interface CardData {
  id: number;
  name: string;
  extra?: Child;
}

export function pokemonCard({ id, name, extra }: CardData): HTMLElement {
  return h(
    'li',
    { class: 'card' },
    h(
      'a',
      { class: 'card-link', href: `/pokemon/${name}` },
      h('img', { class: 'sprite', src: spriteUrl(id), alt: '', width: 96, height: 96, loading: 'lazy', decoding: 'async' }),
      h('span', { class: 'dex' }, dexNumber(id)),
      h('span', { class: 'card-name' }, humanize(name)),
      extra,
    ),
  );
}

export function cardList(cards: CardData[]): HTMLElement {
  return h('ul', { class: 'card-grid' }, cards.map(pokemonCard));
}

/**
 * Turns Pokémon references (from type, move and ability data) into species cards, dropping
 * alternate forms and ordering by dex number.
 */
export function speciesCards<T extends { pokemon: Named }>(
  entries: T[],
  species: Map<number, SpeciesRef>,
  extra?: (entry: T) => Child,
): CardData[] {
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const entry of entries) {
    const id = idFromUrl(entry.pokemon.url);
    if (!(id > 0 && id <= MAX_SPECIES_ID) || seen.has(id)) continue;
    seen.add(id);
    cards.push({ id, name: species.get(id)?.name ?? entry.pokemon.name, extra: extra?.(entry) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

export function descriptionList(items: [term: string, value: Child][], className = ''): HTMLElement {
  return h(
    'dl',
    { class: `facts ${className}`.trim() },
    items.map(([term, value]) => h('div', { class: 'fact' }, h('dt', null, term), h('dd', null, value))),
  );
}
