import { createFileRoute, notFound } from '@tanstack/react-router'
import { fetchAbility } from '../server/functions'
import { pageTitle } from '../lib/format'
import { titleHead } from '../lib/notFound'
import { NotFound } from '../components/NotFound'
import { Section } from '../components/Section'
import { CardGrid } from '../components/PokemonCard'

export const Route = createFileRoute('/abilities/$name')({
  loader: async ({ params }) => {
    const data = await fetchAbility({ data: params.name })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => titleHead(loaderData ? pageTitle(loaderData.label) : undefined),
  component: AbilityPage,
  notFoundComponent: NotFound,
})

function AbilityPage() {
  const data = Route.useLoaderData()
  return (
    <>
      <h1>{data.label}</h1>
      <Section id="effect" title="Effect">
        <p>{data.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{data.pokemon.length} Pokémon</p>
        <CardGrid cards={data.pokemon} />
      </Section>
    </>
  )
}
