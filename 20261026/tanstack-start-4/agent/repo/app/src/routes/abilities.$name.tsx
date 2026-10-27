import { createFileRoute, notFound } from '@tanstack/react-router'
import { PokemonCards } from '../components/PokemonCards'
import { Section } from '../components/Section'
import { EM_DASH, pageTitle } from '../lib/format'
import { NotFound } from '../components/NotFound'
import { fetchAbility } from '../server/functions'

export const Route = createFileRoute('/abilities/$name')({
  loader: async ({ params }) => {
    const data = await fetchAbility({ data: { name: params.name } })
    if (!data) throw notFound()
    return data
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  notFoundComponent: NotFound,
  component: AbilityPage,
})

function AbilityPage() {
  const a = Route.useLoaderData()
  return (
    <>
      <h1>{a.label}</h1>
      <Section id="effect" title="Effect">
        <p>{a.effect ?? EM_DASH}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{a.pokemon.length} Pokémon</p>
        <PokemonCards pokemon={a.pokemon} />
      </Section>
    </>
  )
}
