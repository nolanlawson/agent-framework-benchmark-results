import { Link, createFileRoute } from '@tanstack/react-router'
import { PokemonCards } from '../components/PokemonCards'
import { Section } from '../components/Section'
import { TypeLink } from '../components/TypeBadge'
import { pageTitle } from '../lib/format'
import { fetchType } from '../lib/api'

export const Route = createFileRoute('/types/$name')({
  loader: ({ params }) => fetchType({ data: params.name }),
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: TypePage,
})

function TypePage() {
  const t = Route.useLoaderData()
  return (
    <>
      <h1>{t.label}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {t.relations.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>
                {r.types.length ? (
                  <span className="badges">
                    {r.types.map((type) => (
                      <TypeLink key={type.name} type={type} />
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
      <Section title="Pokémon">
        <p className="muted count">{t.pokemon.length} Pokémon</p>
        <PokemonCards cards={t.pokemon} />
      </Section>
      <Section title="Moves">
        <p className="muted count">{t.moves.length} moves</p>
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
