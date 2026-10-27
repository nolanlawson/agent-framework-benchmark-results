import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { CardList, Count, Section, TypeBadge } from '../components/ui'
import { pageTitle } from '../lib/format'
import { getType } from '../lib/pokedex.functions'

export const Route = createFileRoute('/types/$name')({
  loader: async ({ params }) => {
    const type = await getType({ data: { name: params.name } })
    if (!type) throw notFound()
    return type
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
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
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>
                {r.types.length ? (
                  <span className="badges">
                    {r.types.map((rt) => (
                      <TypeBadge key={rt.name} type={rt} link />
                    ))}
                  </span>
                ) : (
                  'None'
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={t.pokemon.length} />
        <CardList cards={t.pokemon} />
      </Section>
      <Section id="moves" title="Moves">
        <Count n={t.moves.length} noun="moves" />
        <ul className="move-columns">
          {t.moves.map((m) => (
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
