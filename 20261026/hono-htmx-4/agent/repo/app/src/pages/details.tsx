import type { FC } from 'hono/jsx';
import {
  cleanText,
  englishName,
  getTypeLabels,
  getTypes,
  humanize,
  latestEnglishFlavor,
  speciesForPokemon,
  type Ability,
  type Move,
  type Type,
} from '../api.js';
import { CardList, Count, dash, Section, TypeBadge } from '../components.js';

const englishShortEffect = (entries: { short_effect: string; language: { name: string } }[]) => {
  const entry = entries.find((e) => e.language.name === 'en');
  return entry ? cleanText(entry.short_effect) : null;
};

export const MovePage: FC<{ move: Move }> = async ({ move }) => {
  const [typeLabels, learnedBy] = await Promise.all([
    getTypeLabels(),
    speciesForPokemon(move.learned_by_pokemon.map((ref) => ({ ref, extra: null }))),
  ]);
  const effect = englishShortEffect(move.effect_entries) ?? latestEnglishFlavor(move.flavor_text_entries);
  return (
    <>
      <h1>{englishName(move)}</h1>
      <dl class="panel move-facts">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge name={move.type.name} label={typeLabels.get(move.type.name) ?? humanize(move.type.name)} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{dash(move.damage_class && humanize(move.damage_class.name))}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{dash(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{dash(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{dash(move.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{dash(effect)}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <Count n={learnedBy.length} />
        <CardList items={learnedBy} />
      </Section>
    </>
  );
};

export const AbilityPage: FC<{ ability: Ability }> = async ({ ability }) => {
  const pokemon = await speciesForPokemon(ability.pokemon.map((p) => ({ ref: p.pokemon, extra: p.is_hidden })));
  const effect = englishShortEffect(ability.effect_entries) ?? latestEnglishFlavor(ability.flavor_text_entries);
  return (
    <>
      <h1>{englishName(ability)}</h1>
      <Section id="effect" title="Effect">
        <p>{dash(effect)}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={pokemon.length} />
        <CardList
          items={pokemon}
          extra={(_, i) => (pokemon[i].extra ? <span class="card__note">Hidden ability</span> : null)}
        />
      </Section>
    </>
  );
};

export const TypesPage: FC = async () => {
  const types = await getTypes();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-grid">
        {types.map((t) => (
          <li>
            <a class={`type-tile type-${t.name}`} href={`/types/${t.name}`}>
              {t.label}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
};

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

export const TypePage: FC<{ type: Type }> = async ({ type }) => {
  const [typeLabels, pokemon] = await Promise.all([
    getTypeLabels(),
    speciesForPokemon(type.pokemon.map((p) => ({ ref: p.pokemon, extra: null }))),
  ]);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <>
      <h1>{englishName(type)}</h1>
      <Section id="damage" title="Damage relations">
        <dl class="relations">
          {RELATIONS.map(([term, key]) => {
            const related = type.damage_relations[key];
            return (
              <div>
                <dt>{term}</dt>
                <dd>
                  {related.length
                    ? related.map((r) => <TypeBadge name={r.name} label={typeLabels.get(r.name) ?? humanize(r.name)} />)
                    : 'None'}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={pokemon.length} />
        <CardList items={pokemon} />
      </Section>
      <Section id="moves" title="Moves">
        <Count n={moves.length} noun="moves" />
        <ul class="move-grid">
          {moves.map((m) => (
            <li>
              <a href={`/moves/${m.name}`}>{m.label}</a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
};
