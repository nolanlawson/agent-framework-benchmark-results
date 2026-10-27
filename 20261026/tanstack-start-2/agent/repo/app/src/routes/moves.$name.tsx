import { createFileRoute } from '@tanstack/react-router'
import { PokemonCards } from '../components/PokemonCards'
import { Section } from '../components/Section'
import { TypeLink } from '../components/TypeBadge'
import { MISSING, orMissing, pageTitle } from '../lib/format'
import { fetchMove } from '../lib/api'

export const Route = createFileRoute('/moves/$name')({
  loader: ({ params }) => fetchMove({ data: params.name }),
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: MovePage,
})

function MovePage() {
  const m = Route.useLoaderData()
  return (
    <>
      <h1>{m.label}</h1>
      <div className="panel facts-panel">
        <dl className="facts">
          <div>
            <dt>Type</dt>
            <dd>
              <TypeLink type={m.type} />
            </dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{m.category ?? MISSING}</dd>
          </div>
          <div>
            <dt>Power</dt>
            <dd>{orMissing(m.power)}</dd>
          </div>
          <div>
            <dt>Accuracy</dt>
            <dd>{orMissing(m.accuracy)}</dd>
          </div>
          <div>
            <dt>PP</dt>
            <dd>{orMissing(m.pp)}</dd>
          </div>
        </dl>
      </div>
      <Section title="Effect">
        <p>{m.effect ?? MISSING}</p>
      </Section>
      <Section title="Learned by">
        <p className="muted count">{m.learnedBy.length} Pokémon</p>
        <PokemonCards cards={m.learnedBy} />
      </Section>
    </>
  )
}
