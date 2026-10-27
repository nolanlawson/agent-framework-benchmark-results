import { englishName, getAbility, latestFlavorText, shortEffect } from '../api';
import { cardList, countText, MISSING, section } from '../components';
import { html } from '../html';
import type { Page, PageContext } from '../router';
import { speciesCards } from './shared';

export async function abilityPage({ params: [name] }: PageContext): Promise<Page> {
  const ability = await getAbility(name);
  const cards = await speciesCards(ability.pokemon, (ref) =>
    ref.is_hidden ? html`<span class="card__note">Hidden ability</span>` : undefined,
  );
  const title = englishName(ability);
  return {
    title,
    body: html`<h1>${title}</h1>
      ${section('effect', 'Effect', html`<p>${shortEffect(ability) ?? latestFlavorText(ability.flavor_text_entries) ?? MISSING}</p>`)}
      ${section('pokemon', 'Pokémon', html`${countText(cards.length)}${cardList(cards)}`)}`,
  };
}
