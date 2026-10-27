import { CardGrid, Count, PokemonCard, Section, TypeBadge } from '../components.js'
import {
  allTypes,
  englishName,
  flavorText,
  shortEffect,
  speciesForPokemon,
  typeNames,
  type AbilityData,
  type MoveData,
  type TypeData,
} from '../data.js'
import { DASH, humanize, orDash } from '../util.js'

export async function MovePage({ move }: { move: MoveData }) {
  const [types, learnedBy] = await Promise.all([typeNames(), speciesForPokemon(move.learned_by_pokemon)])
  const effect = shortEffect(move) ?? flavorText(move) ?? DASH
  return (
    <>
      <h1>{englishName(move)}</h1>
      <dl class="panel facts facts--move">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge name={move.type.name} label={types.get(move.type.name) ?? humanize(move.type.name)} />
          </dd>
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
        <Count n={learnedBy.length} />
        <CardGrid>
          {learnedBy.map(({ species }) => (
            <PokemonCard species={species} />
          ))}
        </CardGrid>
      </Section>
    </>
  )
}

export async function AbilityPage({ ability }: { ability: AbilityData }) {
  const pokemon = await speciesForPokemon(ability.pokemon.map((p) => ({ ...p, url: p.pokemon.url })))
  const effect = shortEffect(ability) ?? flavorText(ability) ?? DASH
  return (
    <>
      <h1>{englishName(ability)}</h1>
      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={pokemon.length} />
        <CardGrid>
          {pokemon.map(({ species, ref }) => (
            <PokemonCard species={species} extra={ref.is_hidden && <span class="card__note">Hidden ability</span>} />
          ))}
        </CardGrid>
      </Section>
    </>
  )
}

export async function TypesPage() {
  const types = await allTypes()
  return (
    <>
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
    </>
  )
}

const RELATIONS: [string, string][] = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
]

export async function TypePage({ type }: { type: TypeData }) {
  const [types, pokemon] = await Promise.all([
    typeNames(),
    speciesForPokemon(type.pokemon.map((p) => ({ url: p.pokemon.url }))),
  ])
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label))
  return (
    <>
      <h1>{englishName(type)}</h1>
      <Section id="relations" title="Damage relations">
        <dl class="relations">
          {RELATIONS.map(([term, key]) => {
            const related = type.damage_relations[key] ?? []
            return (
              <div>
                <dt>{term}</dt>
                <dd>
                  {related.length
                    ? related.map((r) => <TypeBadge name={r.name} label={types.get(r.name) ?? humanize(r.name)} />)
                    : 'None'}
                </dd>
              </div>
            )
          })}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={pokemon.length} />
        <CardGrid>
          {pokemon.map(({ species }) => (
            <PokemonCard species={species} />
          ))}
        </CardGrid>
      </Section>
      <Section id="type-moves" title="Moves">
        <Count n={moves.length} noun="moves" />
        <ul class="move-columns">
          {moves.map((m) => (
            <li>
              <a href={`/moves/${m.name}`}>{m.label}</a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}

export const NotFoundPage = () => (
  <>
    <h1>Not found</h1>
    <p>
      <a href="/">Back to the Pokédex</a>
    </p>
  </>
)

export const ErrorPage = () => (
  <>
    <h1>Something went wrong</h1>
    <p>
      The Pokédex couldn’t load this page. <a href="/">Back to the Pokédex</a>
    </p>
  </>
)
