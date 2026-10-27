import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { fetchType } from '../server/functions'
import { pageTitle } from '../lib/format'
import { titleHead } from '../lib/notFound'
import { NotFound } from '../components/NotFound'
import { Section } from '../components/Section'
import { TypeList } from '../components/TypeBadge'
import { CardGrid } from '../components/PokemonCard'

export const Route = createFileRoute('/types/$name')({
  loader: async ({ params }) => {
    const data = await fetchType({ data: params.name })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => titleHead(loaderData ? pageTitle(loaderData.label) : undefined),
  component: TypePage,
  notFoundComponent: NotFound,
})

function TypePage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.label}</h1>
      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {data.relations.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.types.length ? <TypeList types={r.types} /> : 'None'}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{data.pokemon.length} Pokémon</p>
        <CardGrid cards={data.pokemon} />
      </Section>
      <Section id="moves" title="Moves">
        <p className="count">{data.moves.length} moves</p>
        <ul className="move-columns">
          {data.moves.map((m) => (
            <li key={m.name}>
              <Link to="/moves/$name" params={{ name: m.name }}>
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
