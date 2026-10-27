import type { Context } from 'hono';
import { CardList, Count, DASH, orDash, Section, TypeBadge } from '../components.js';
import { cardsForPokemon, englishName, englishShortEffect, find, humanize, latestFlavorText, typeIndex, typeLabel } from '../data.js';
import { notFoundPage } from './not-found.js';

export async function movePage(c: Context) {
  const name = c.req.param('name')!;
  const move = await find(`move/${encodeURIComponent(name.toLowerCase())}`);
  if (!move) return notFoundPage(c);

  const [types, cards] = await Promise.all([
    typeIndex(),
    cardsForPokemon((move.learned_by_pokemon ?? []).map((p: any) => ({ pokemon: p }))),
  ]);
  const title = englishName(move.names, move.name);
  const effect =
    englishShortEffect(move.effect_entries, move.effect_chance) ?? latestFlavorText(move.flavor_text_entries) ?? DASH;

  return c.render(
    <>
      <h1>{title}</h1>
      <dl class="panel facts facts--move">
        <div>
          <dt>Type</dt>
          <dd>{move.type ? <TypeBadge name={move.type.name} label={typeLabel(types.byName, move.type.name)} link /> : DASH}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class ? humanize(move.damage_class.name) : DASH}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(move.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <Count n={cards.length} />
        <CardList cards={cards} />
      </Section>
    </>,
    { title },
  );
}
