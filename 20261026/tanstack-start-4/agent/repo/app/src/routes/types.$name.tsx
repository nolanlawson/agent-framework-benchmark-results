import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { PokemonCards } from '../components/PokemonCards'
import { Section } from '../components/Section'
import { TypeBadges } from '../components/TypeBadge'
import { pageTitle } from '../lib/format'
import { NotFound } from '../components/NotFound'
import { fetchType } from '../server/functions'

export const Route = createFileRoute('/types/$name')({
  loader: async ({ params }) => {
    const data = await fetchType({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  notFoundComponent: NotFound,
  component: TypePage,
})

function TypePage() {
  const t = Route.useLoaderData()
  return (
    <>
      <h1>{t.label}</h1>
      <Section id="relations" title="Damage relations">
        <dl className="relations">
          {t.relations.map((r) => (
            <div key={r.key}>
              <dt>{r.label}</dt>
              <dd>{r.types.length ? <TypeBadges types={r.types} /> : 'None'}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{t.pokemon.length} Pokémon</p>
        <PokemonCards pokemon={t.pokemon} />
      </Section>
      <Section id="moves" title="Moves">
        <p className="count">{t.moves.length} moves</p>
        <ul className="move-columns">
          {t.moves.map((m) => (
            <li key={m.value}>
              <Link to="/moves/$name" params={{ name: m.value }}>
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  )
}
