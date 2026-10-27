import type { AbilityData } from '#shared/types/pokedex'

export default defineEventHandler(async (event): Promise<AbilityData> => {
  const ability = await fetchResource('ability', getRouterParam(event, 'name') ?? '')
  const pokemon = await speciesCards(
    (ability.pokemon ?? []).map((p: { is_hidden: boolean; pokemon: { name: string; url: string } }) => ({
      pokemon: p.pokemon,
      hidden: p.is_hidden,
    })),
  )
  return {
    name: ability.name,
    label: englishName(ability.names, ability.name),
    effect: shortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries),
    pokemon,
  }
})
