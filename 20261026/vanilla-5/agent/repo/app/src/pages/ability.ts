import { getResource, speciesById, type Ability } from '../api';
import { cardList, count, section, speciesCards, type Page } from '../components';
import { h } from '../dom';
import { english, englishName, latestFlavorText, MISSING } from '../format';

export async function abilityPage(name: string): Promise<Page> {
  const [ability, species] = await Promise.all([getResource<Ability>('ability', name), speciesById()]);
  const title = englishName(ability);
  const effect = english(ability.effect_entries)?.short_effect ?? latestFlavorText(ability.flavor_text_entries) ?? MISSING;
  const cards = speciesCards(ability.pokemon, species, (entry) => entry.is_hidden && h('span', { class: 'card-note' }, 'Hidden ability'));

  return {
    title,
    content: [
      h('h1', null, title),
      section('Effect', {}, h('p', null, effect)),
      section('Pokémon', {}, count(cards.length), cards.length > 0 && cardList(cards)),
    ],
  };
}
