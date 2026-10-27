import { getResource, speciesById, typeNames, type Move } from '../api';
import { cardList, count, descriptionList, section, speciesCards, typeBadge, type Page } from '../components';
import { h } from '../dom';
import { english, englishName, humanize, latestFlavorText, MISSING, orMissing } from '../format';

export async function movePage(name: string): Promise<Page> {
  const [move, species, types] = await Promise.all([getResource<Move>('move', name), speciesById(), typeNames()]);
  const title = englishName(move);
  const shortEffect = english(move.effect_entries)?.short_effect?.replaceAll('$effect_chance', String(move.effect_chance ?? ''));
  const effect = shortEffect ?? latestFlavorText(move.flavor_text_entries) ?? MISSING;
  const cards = speciesCards(move.learned_by_pokemon.map((pokemon) => ({ pokemon })), species);

  return {
    title,
    content: [
      h('h1', null, title),
      h(
        'div',
        { class: 'panel panel-compact' },
        descriptionList(
          [
            ['Type', typeBadge(move.type.name, types.get(move.type.name) ?? humanize(move.type.name))],
            ['Category', orMissing(move.damage_class && humanize(move.damage_class.name))],
            ['Power', orMissing(move.power)],
            ['Accuracy', orMissing(move.accuracy)],
            ['PP', orMissing(move.pp)],
          ],
          'facts-inline',
        ),
      ),
      section('Effect', {}, h('p', null, effect)),
      section('Learned by', {}, count(cards.length), cards.length > 0 && cardList(cards)),
    ],
  };
}
