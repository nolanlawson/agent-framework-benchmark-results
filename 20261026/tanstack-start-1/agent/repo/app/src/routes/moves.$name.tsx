import { createFileRoute, notFound } from '@tanstack/react-router'
import { fetchMove } from '../server/functions'
import { orDash, pageTitle } from '../lib/format'
import { titleHead } from '../lib/notFound'
import { NotFound } from '../components/NotFound'
import { Section } from '../components/Section'
import { TypeBadge } from '../components/TypeBadge'
import { CardGrid } from '../components/PokemonCard'

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ params }) => {
    const data = await fetchMove({ data: params.name })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => titleHead(loaderData ? pageTitle(loaderData.label) : undefined),
  component: MovePage,
  notFoundComponent: NotFound,
})

function MovePage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.label}</h1>
      <div className="panel facts-panel">
        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>{data.type ? <TypeBadge type={data.type} /> : '—'}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{orDash(data.category)}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{orDash(data.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{orDash(data.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{orDash(data.pp)}</dd>
          </div>
        </dl>
      </div>
      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <p className="count">{data.learnedBy.length} Pokémon</p>
        <CardGrid cards={data.learnedBy} />
      </Section>
    </>
  )
}
