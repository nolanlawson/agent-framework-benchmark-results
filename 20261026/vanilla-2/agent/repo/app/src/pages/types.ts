import { englishName, getMainTypes, getType, getTypeNames, humanize, type Type } from '../api';
import { cardList, countText, section, typeBadge } from '../components';
import { html } from '../html';
import type { Page, PageContext } from '../router';
import { speciesCards } from './shared';

export async function typesPage(): Promise<Page> {
  const types = await getMainTypes();
  return {
    title: 'Types',
    body: html`<h1>Types</h1>
      <ul class="type-grid" role="list">
        ${types.map((t) => html`<li><a class="type-tile type-${t.name}" href="/types/${t.name}">${englishName(t)}</a></li>`)}
      </ul>`,
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

export async function typePage({ params: [name] }: PageContext): Promise<Page> {
  const type = await getType(name);
  const [typeNames, cards] = await Promise.all([getTypeNames(), speciesCards(type.pokemon)]);
  const moves = [...type.moves].sort((a, b) => a.name.localeCompare(b.name));
  const title = englishName(type);
  const relations = html`<dl class="relations">
    ${RELATIONS.map(([key, label]) => {
      const related = type.damage_relations[key];
      return html`<div>
        <dt>${label}</dt>
        <dd>${
          related.length
            ? html`<span class="badges">${related.map((t) => typeBadge(t.name, typeNames.get(t.name) ?? humanize(t.name)))}</span>`
            : 'None'
        }</dd>
      </div>`;
    })}
  </dl>`;
  return {
    title,
    body: html`<h1>${title}</h1>
      ${section('relations', 'Damage relations', relations)}
      ${section('pokemon', 'Pokémon', html`${countText(cards.length)}${cardList(cards)}`)}
      ${section(
        'moves',
        'Moves',
        html`${countText(moves.length, 'moves')}
          <ul class="move-list" role="list">
            ${moves.map((m) => html`<li><a href="/moves/${m.name}">${humanize(m.name)}</a></li>`)}
          </ul>`,
      )}`,
  };
}
