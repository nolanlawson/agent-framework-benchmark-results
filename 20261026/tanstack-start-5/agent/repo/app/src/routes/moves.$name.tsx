import { createFileRoute, notFound } from '@tanstack/react-router'
import { CardList, Count, Section, TypeBadge } from '../components/ui'
import { orDash, pageTitle } from '../lib/format'
import { getMove } from '../lib/pokedex.functions'

export const Route = createFileRoute('/moves/$name')({
  loader: async ({ params }) => {
    const move = await getMove({ data: { name: params.name } })
    if (!move) throw notFound()
    return move
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
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
          <dd>{m.type ? <TypeBadge type={m.type} link /> : '—'}</dd>
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
        <p>{m.effect}</p>
      </Section>
      <Section id="learned-by" title="Learned by">
        <Count n={m.learnedBy.length} />
        <CardList cards={m.learnedBy} />
      </Section>
    </>
  )
}
