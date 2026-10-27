import type { Context } from 'hono';
import { CardList, Count, Section, TypeLinks } from '../components.js';
import { cardsForPokemon, humanize, typeIndex } from '../data.js';
import { notFoundPage } from './not-found.js';

export async function typesPage(c: Context) {
  const types = await typeIndex();
  return c.render(
    <>
      <h1>Types</h1>
      <ul class="type-grid">
        {types.all.map((t) => (
          <li>
            <a class={`type-tile type-${t.name}`} href={`/types/${t.name}`}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </>,
    { title: 'Types' },
  );
}

const RELATIONS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
];

export async function typePage(c: Context) {
  const name = c.req.param('name')!.toLowerCase();
  const types = await typeIndex();
  const type = types.byName.get(name);
  if (!type) return notFoundPage(c);

  const { detail } = type;
  const cards = await cardsForPokemon(detail.pokemon ?? []);
  const moves = [...(detail.moves ?? [])]
    .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return c.render(
    <>
      <h1>{type.label}</h1>
      <Section id="relations" title="Damage relations">
        <dl class="relations">
          {RELATIONS.map(([label, key]) => {
            const related: string[] = (detail.damage_relations?.[key] ?? []).map((t: any) => t.name);
            return (
              <div>
                <dt>{label}</dt>
                <dd>{related.length ? <TypeLinks names={related} types={types.byName} /> : 'None'}</dd>
              </div>
            );
          })}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={cards.length} />
        <CardList cards={cards} />
      </Section>
      <Section id="moves" title="Moves">
        <Count n={moves.length} noun="moves" />
        <ul class="move-columns">
          {moves.map((m) => (
            <li>
              <a href={`/moves/${m.name}`}>{m.label}</a>
            </li>
          ))}
        </ul>
      </Section>
    </>,
    { title: type.label },
  );
}

