import { allTypes, englishName, get, humanize, NotFoundError, toSpeciesCards, typeNames, type Type } from '../api';
import { cardList, countText, pokemonCard, typeBadge } from '../components';
import { h, section } from '../dom';

export async function typesPage(): Promise<Node> {
  const types = await allTypes();
  return h(
    'div',
    null,
    h('h1', null, 'Types'),
    h(
      'ul',
      { class: 'type-grid' },
      types.map((t) => h('li', null, h('a', { class: `type-tile type-${t.name}`, href: `/types/${t.name}` }, englishName(t)))),
    ),
  );
}

const RELATIONS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function typePage([name]: string[]): Promise<Node> {
  if (['stellar', 'unknown', 'shadow'].includes(name)) throw new NotFoundError(name);
  const type = await get<Type>(`type/${encodeURIComponent(name)}`);
  const [names, cards] = await Promise.all([typeNames(), toSpeciesCards(type.pokemon)]);
  const moves = type.moves.map((m) => ({ name: m.name, label: humanize(m.name) })).sort((a, b) => a.label.localeCompare(b.label));

  return h(
    'div',
    { class: 'stack' },
    h('h1', null, englishName(type)),
    section(
      'Damage relations',
      {},
      h(
        'dl',
        { class: 'relations' },
        RELATIONS.map(([term, key]) => {
          const related = type.damage_relations[key] ?? [];
          return h(
            'div',
            null,
            h('dt', null, term),
            h(
              'dd',
              null,
              related.length
                ? h('span', { class: 'types' }, related.map((t) => typeBadge(t.name, names.get(t.name) ?? humanize(t.name))))
                : 'None',
            ),
          );
        }),
      ),
    ),
    section('Pokémon', {}, countText(cards.length), cardList(cards.map((c) => pokemonCard(c)))),
    section(
      'Moves',
      {},
      countText(moves.length, 'moves'),
      h('ul', { class: 'move-columns' }, moves.map((m) => h('li', null, h('a', { href: `/moves/${m.name}` }, m.label)))),
    ),
  );
}
