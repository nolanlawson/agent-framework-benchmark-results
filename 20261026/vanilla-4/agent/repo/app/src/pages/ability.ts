import { englishName, get, latestFlavorText, toSpeciesCards, type Ability } from '../api';
import { cardList, countText, pokemonCard } from '../components';
import { DASH, h, section } from '../dom';

export async function abilityPage([name]: string[]): Promise<Node> {
  const ability = await get<Ability>(`ability/${encodeURIComponent(name)}`);
  const cards = await toSpeciesCards(ability.pokemon);
  const effect =
    ability.effect_entries.find((e) => e.language.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() ||
    latestFlavorText(ability.flavor_text_entries) ||
    DASH;

  return h(
    'div',
    { class: 'stack' },
    h('h1', null, englishName(ability)),
    section('Effect', {}, h('p', null, effect)),
    section(
      'Pokémon',
      {},
      countText(cards.length),
      cardList(cards.map((c) => pokemonCard(c, c.item.is_hidden ? h('span', { class: 'note' }, 'Hidden ability') : null))),
    ),
  );
}
