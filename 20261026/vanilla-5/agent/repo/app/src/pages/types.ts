import { allTypes, getResource, speciesById, typeNames, type Type } from '../api';
import { cardList, count, descriptionList, section, speciesCards, typeBadge, type Page } from '../components';
import { h } from '../dom';
import { englishName, humanize } from '../format';

export async function typesPage(): Promise<Page> {
  const types = await allTypes();
  return {
    title: 'Types',
    content: [
      h('h1', null, 'Types'),
      h(
        'ul',
        { class: 'type-grid' },
        types.map((t) => h('li', null, h('a', { class: `type-tile type-${t.name}`, href: `/types/${t.name}` }, englishName(t)))),
      ),
    ],
  };
}

const RELATIONS: [label: string, key: keyof Type['damage_relations']][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function typePage(name: string): Promise<Page> {
  const [type, species, names] = await Promise.all([getResource<Type>('type', name), speciesById(), typeNames()]);
  const title = englishName(type);
  const cards = speciesCards(type.pokemon, species);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    title,
    content: [
      h('h1', null, title),
      section(
        'Damage relations',
        {},
        descriptionList(
          RELATIONS.map(([label, key]) => {
            const related = type.damage_relations[key];
            return [
              label,
              related.length
                ? h('span', { class: 'type-badges' }, related.map((t) => typeBadge(t.name, names.get(t.name) ?? humanize(t.name))))
                : 'None',
            ];
          }),
          'relations',
        ),
      ),
      section('Pokémon', {}, count(cards.length), cards.length > 0 && cardList(cards)),
      section(
        'Moves',
        {},
        count(moves.length, 'moves'),
        moves.length > 0 && h('ul', { class: 'move-list' }, moves.map((m) => h('li', null, h('a', { href: `/moves/${m.name}` }, m.label)))),
      ),
    ],
  };
}
