import { createFileRoute } from '@tanstack/react-router'
import { PokemonCards } from '../components/PokemonCards'
import { Section } from '../components/Section'
import { MISSING, pageTitle } from '../lib/format'
import { fetchAbility } from '../lib/api'

export const Route = createFileRoute('/abilities/$name')({
  loader: ({ params }) => fetchAbility({ data: params.name }),
  head: ({ loaderData }) => ({ meta: [{ title: pageTitle(loaderData?.label ?? 'Not found') }] }),
  component: AbilityPage,
})

function AbilityPage() {
  const a = Route.useLoaderData()
  return (
    <>
      <h1>{a.label}</h1>
      <Section title="Effect">
        <p>{a.effect ?? MISSING}</p>
      </Section>
      <Section title="Pokémon">
        <p className="muted count">{a.pokemon.length} Pokémon</p>
        <PokemonCards cards={a.pokemon} />
      </Section>
    </>
  )
}
