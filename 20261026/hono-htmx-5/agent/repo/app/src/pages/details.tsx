import { cardsForPokemon, englishName, get, humanize, latestFlavorText, mainTypes, typeLabel } from '../api';
import { Card, CardList, display, Layout, Section, TypeBadge } from '../components';

const englishEffect = (record: any) => {
  const entry = record.effect_entries?.find((e: any) => e.language.name === 'en');
  return entry?.short_effect?.replaceAll('$effect_chance', String(record.effect_chance ?? '')).replace(/\s+/g, ' ').trim();
};

export async function MovePage({ name }: { name: string }) {
  const move = await get(`move/${encodeURIComponent(name)}`);
  const [type, learnedBy] = await Promise.all([
    typeLabel(move.type.name).then((label) => ({ name: move.type.name, label })),
    cardsForPokemon((move.learned_by_pokemon ?? []).map((pokemon: any) => ({ pokemon }))),
  ]);
  const title = englishName(move);
  const effect = englishEffect(move) ?? latestFlavorText(move.flavor_text_entries) ?? '—';
  return (
    <Layout title={title}>
      <h1>{title}</h1>
      <dl class="panel facts">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge type={type} link />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{display(move.damage_class ? humanize(move.damage_class.name) : null)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{display(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{display(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{display(move.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <p class="count">{learnedBy.length} Pokémon</p>
        <CardList>
          {learnedBy.map(({ species }) => (
            <Card id={species.id} name={species.name} />
          ))}
        </CardList>
      </Section>
    </Layout>
  );
}

export async function AbilityPage({ name }: { name: string }) {
  const ability = await get(`ability/${encodeURIComponent(name)}`);
  const pokemon = await cardsForPokemon<{ is_hidden: boolean; pokemon: any }>(ability.pokemon ?? []);
  const title = englishName(ability);
  return (
    <Layout title={title}>
      <h1>{title}</h1>
      <Section id="effect" title="Effect">
        <p>{englishEffect(ability) ?? latestFlavorText(ability.flavor_text_entries) ?? '—'}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{pokemon.length} Pokémon</p>
        <CardList>
          {pokemon.map(({ species, ref }) => (
            <Card id={species.id} name={species.name} extra={ref.is_hidden && <span class="note">Hidden ability</span>} />
          ))}
        </CardList>
      </Section>
    </Layout>
  );
}

export async function TypesPage() {
  const types = await mainTypes();
  return (
    <Layout title="Types">
      <h1>Types</h1>
      <ul class="type-grid">
        {types.map((t) => (
          <li>
            <a class={`type-tile type-${t.name}`} href={`/types/${t.name}`}>
              {englishName(t)}
            </a>
          </li>
        ))}
      </ul>
    </Layout>
  );
}

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

export async function TypePage({ name }: { name: string }) {
  const type = await get(`type/${encodeURIComponent(name)}`);
  const relations = await Promise.all(
    RELATIONS.map(async ([label, key]) => ({
      label,
      types: await Promise.all(
        (type.damage_relations?.[key] ?? []).map(async (t: any) => ({ name: t.name, label: await typeLabel(t.name) })),
      ),
    })),
  );
  const pokemon = await cardsForPokemon(type.pokemon ?? []);
  const moves = [...(type.moves ?? [])]
    .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const title = englishName(type);
  return (
    <Layout title={title}>
      <h1>{title}</h1>
      <Section id="relations" title="Damage relations">
        <dl class="relations">
          {relations.map((r) => (
            <div>
              <dt>{r.label}</dt>
              <dd>
                {r.types.length === 0 ? (
                  'None'
                ) : (
                  <span class="badges">
                    {r.types.map((t) => (
                      <TypeBadge type={t} link />
                    ))}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{pokemon.length} Pokémon</p>
        <CardList>
          {pokemon.map(({ species }) => (
            <Card id={species.id} name={species.name} />
          ))}
        </CardList>
      </Section>
      <Section id="moves" title="Moves">
        <p class="count">{moves.length} moves</p>
        <ul class="move-columns">
          {moves.map((m) => (
            <li>
              <a href={`/moves/${m.name}`}>{m.label}</a>
            </li>
          ))}
        </ul>
      </Section>
    </Layout>
  );
}
