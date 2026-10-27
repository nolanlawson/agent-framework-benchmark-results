import { createFileRoute, notFound } from '@tanstack/react-router'
import { PokemonCards } from '../components/PokemonCards'
import { Section } from '../components/Section'
import { TypeBadge } from '../components/TypeBadge'
import { EM_DASH, orDash, pageTitle } from '../lib/format'
import { NotFound } from '../components/NotFound'
import { fetchMove } from '../server/functions'

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ params }) => {
    const data = await fetchMove({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  notFoundComponent: NotFound,
  component: MovePage,
})

function MovePage() {
  const m = Route.useLoaderData()
  return (
    <>
      <h1>{m.label}</h1>
      <dl className="panel details">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge type={m.type} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{orDash(m.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(m.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(m.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(m.pp)}</dd>
        </div>
      </dl>
      <Section id="effect" title="Effect">
        <p>{m.effect ?? EM_DASH}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <p className="count">{m.learnedBy.length} Pokémon</p>
        <PokemonCards pokemon={m.learnedBy} />
      </Section>
    </>
  )
}
