import type { Context } from 'hono';
import { CardList, Count, DASH, Section } from '../components.js';
import { cardsForPokemon, englishName, englishShortEffect, find, latestFlavorText } from '../data.js';
import { notFoundPage } from './not-found.js';

export async function abilityPage(c: Context) {
  const name = c.req.param('name')!;
  const ability = await find(`ability/${encodeURIComponent(name.toLowerCase())}`);
  if (!ability) return notFoundPage(c);

  const cards = await cardsForPokemon(ability.pokemon ?? [], (p: any) => ({ hidden: Boolean(p.is_hidden) }));
  const title = englishName(ability.names, ability.name);
  const effect = englishShortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries) ?? DASH;

  return c.render(
    <>
      <h1>{title}</h1>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={cards.length} />
        <CardList cards={cards} />
      </Section>
    </>,
    { title },
  );
}
