import {
  englishName,
  englishShortEffect,
  get,
  getSpeciesNames,
  getTypeNames,
  getTypes,
  humanize,
  idFromUrl,
  isDefaultForm,
  latestFlavorText,
  type Ability,
  type Move,
  type NamedRef,
  type Type,
} from '../api';
import { EM_DASH, cardGrid, countLine, pageTitle, typeBadge, type CardData } from '../components';
import { h, section } from '../dom';
import type { RouteContext, View } from '../router';

const slug = (params: string[]) => encodeURIComponent(params[0].toLowerCase());

/** Cards for Pokémon references: alternate forms dropped, mapped to species, by dex number. */
function toCards<T>(
  items: T[],
  ref: (item: T) => NamedRef,
  speciesNames: Map<number, string>,
  note?: (item: T) => string | undefined,
): CardData[] {
  const cards = new Map<number, CardData>();
  for (const item of items) {
    const id = idFromUrl(ref(item).url);
    const speciesName = speciesNames.get(id);
    if (!isDefaultForm(id) || !speciesName || cards.has(id)) continue;
    cards.set(id, { id, speciesName, note: note?.(item) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

const cardsBlock = (cards: CardData[]) => [countLine(cards.length), cards.length ? cardGrid(cards) : null];

function factList(items: [string, Node | string | number][]): HTMLDListElement {
  return h(
    'dl',
    { class: 'facts' },
    items.map(([term, value]) => h('div', null, h('dt', null, term), h('dd', null, value))),
  );
}

const orDash = (v: number | null | undefined) => (v === null || v === undefined ? EM_DASH : v);

export async function movePage({ params }: RouteContext): Promise<View> {
  const [move, speciesNames, typeNames] = await Promise.all([
    get<Move>(`move/${slug(params)}`),
    getSpeciesNames(),
    getTypeNames(),
  ]);
  const name = englishName(move);
  const effect = englishShortEffect(move.effect_entries) ?? latestFlavorText(move.flavor_text_entries) ?? EM_DASH;
  const cards = toCards(move.learned_by_pokemon, (p) => p, speciesNames);

  return {
    title: name,
    node: h(
      'div',
      { class: 'stack' },
      pageTitle(name),
      h(
        'div',
        { class: 'panel panel--compact' },
        factList([
          ['Type', typeBadge(move.type.name, typeNames.get(move.type.name) ?? humanize(move.type.name))],
          ['Category', move.damage_class ? humanize(move.damage_class.name) : EM_DASH],
          ['Power', orDash(move.power)],
          ['Accuracy', orDash(move.accuracy)],
          ['PP', orDash(move.pp)],
        ]),
      ),
      section('Effect', null, h('p', null, effect)),
      section('Learned by', null, cardsBlock(cards)),
    ),
  };
}

export async function abilityPage({ params }: RouteContext): Promise<View> {
  const [ability, speciesNames] = await Promise.all([get<Ability>(`ability/${slug(params)}`), getSpeciesNames()]);
  const name = englishName(ability);
  const effect =
    englishShortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries) ?? EM_DASH;
  const cards = toCards(
    ability.pokemon,
    (p) => p.pokemon,
    speciesNames,
    (p) => (p.is_hidden ? 'Hidden ability' : undefined),
  );

  return {
    title: name,
    node: h(
      'div',
      { class: 'stack' },
      pageTitle(name),
      section('Effect', null, h('p', null, effect)),
      section('Pokémon', null, cardsBlock(cards)),
    ),
  };
}

export async function typesPage(): Promise<View> {
  const types = await getTypes();
  return {
    title: 'Types',
    node: h(
      'div',
      { class: 'stack' },
      pageTitle('Types'),
      h(
        'ul',
        { class: 'type-grid' },
        types.map((t) => h('li', null, h('a', { class: `type-tile type-badge--${t.name}`, href: `/types/${t.name}` }, englishName(t)))),
      ),
    ),
  };
}

const RELATIONS: [keyof Type['damage_relations'], string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export async function typePage({ params }: RouteContext): Promise<View> {
  const [type, speciesNames, typeNames] = await Promise.all([
    get<Type>(`type/${slug(params)}`),
    getSpeciesNames(),
    getTypeNames(),
  ]);
  const name = englishName(type);
  const cards = toCards(type.pokemon, (p) => p.pokemon, speciesNames);
  const moves = type.moves
    .map((m) => ({ slug: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    title: name,
    node: h(
      'div',
      { class: 'stack' },
      pageTitle(name),
      section(
        'Damage relations',
        null,
        h(
          'dl',
          { class: 'relations' },
          RELATIONS.map(([key, label]) => {
            const related = type.damage_relations[key] ?? [];
            return h(
              'div',
              null,
              h('dt', null, label),
              h(
                'dd',
                null,
                related.length
                  ? h(
                      'ul',
                      { class: 'badge-list' },
                      related.map((t) => h('li', null, typeBadge(t.name, typeNames.get(t.name) ?? humanize(t.name)))),
                    )
                  : 'None',
              ),
            );
          }),
        ),
      ),
      section('Pokémon', null, cardsBlock(cards)),
      section(
        'Moves',
        null,
        countLine(moves.length, 'moves'),
        moves.length
          ? h(
              'ul',
              { class: 'columns' },
              moves.map((m) => h('li', null, h('a', { href: `/moves/${m.slug}` }, m.label))),
            )
          : null,
      ),
    ),
  };
}
