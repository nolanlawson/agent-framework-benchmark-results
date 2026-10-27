import { createFileRoute, notFound } from '@tanstack/react-router'
import { CardList, Count, Section } from '../components/ui'
import { pageTitle } from '../lib/format'
import { getAbility } from '../lib/pokedex.functions'

export const Route = createFileRoute('/abilities/$name')({
  loader: async ({ params }) => {
    const ability = await getAbility({ data: { name: params.name } })
    if (!ability) throw notFound()
    return ability
  },
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: AbilityPage,
})

function AbilityPage() {
  const a = Route.useLoaderData()
  return (
    <>
      <h1>{a.label}</h1>
      <Section id="effect" title="Effect">
        <p>{a.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <Count n={a.pokemon.length} />
        <CardList cards={a.pokemon} />
      </Section>
    </>
  )
}
