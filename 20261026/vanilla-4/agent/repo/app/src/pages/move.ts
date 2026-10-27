import { englishName, get, humanize, latestFlavorText, toSpeciesCards, typeNames, type Move } from '../api';
import { cardList, countText, pokemonCard, typeBadge } from '../components';
import { DASH, h, orDash, section } from '../dom';

export async function movePage([name]: string[]): Promise<Node> {
  const move = await get<Move>(`move/${encodeURIComponent(name)}`);
  const [types, cards] = await Promise.all([
    typeNames(),
    toSpeciesCards(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  const effect =
    move.effect_entries.find((e) => e.language.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() ||
    latestFlavorText(move.flavor_text_entries) ||
    DASH;

  const fact = (term: string, value: Node | string) => h('div', null, h('dt', null, term), h('dd', null, value));

  return h(
    'div',
    { class: 'stack' },
    h('h1', null, englishName(move)),
    h(
      'dl',
      { class: 'card facts' },
      fact('Type', typeBadge(move.type.name, types.get(move.type.name) ?? humanize(move.type.name))),
      fact('Category', move.damage_class ? humanize(move.damage_class.name) : DASH),
      fact('Power', orDash(move.power)),
      fact('Accuracy', orDash(move.accuracy)),
      fact('PP', orDash(move.pp)),
    ),
    section('Effect', {}, h('p', null, effect)),
    section('Learned by', {}, countText(cards.length), cardList(cards.map((c) => pokemonCard(c)))),
  );
}
