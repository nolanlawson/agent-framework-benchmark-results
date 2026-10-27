import type { AbilityDetail } from '#shared/types'

export default defineEventHandler(async (event): Promise<AbilityDetail> => {
  const name = safeName(getRouterParam(event, 'name'))
  const [ability, index] = await Promise.all([apiOrThrow(`ability/${name}`), getIndex()])
  return {
    name: ability.name,
    label: englishName(ability.names, ability.name),
    effect: english<{ short_effect: string; language: { name: string } }>(ability.effect_entries)?.short_effect
      ?? latestEnglishFlavor(ability.flavor_text_entries)
      ?? MISSING,
    pokemon: cardsFor(
      index,
      ability.pokemon,
      (p: { pokemon: { url: string } }) => p.pokemon.url,
      (p: { is_hidden: boolean }) => ({ hidden: p.is_hidden }),
    ),
  }
})
