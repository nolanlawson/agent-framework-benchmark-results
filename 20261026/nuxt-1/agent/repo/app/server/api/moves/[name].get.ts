import type { MoveDetail } from '#shared/types'

export default defineEventHandler(async (event): Promise<MoveDetail> => {
  const name = safeName(getRouterParam(event, 'name'))
  const [move, index] = await Promise.all([apiOrThrow(`move/${name}`), getIndex()])
  const summary = summarizeMove(move, index)
  const shortEffect = english<{ short_effect: string; language: { name: string } }>(move.effect_entries)?.short_effect
  return {
    ...summary,
    effect:
      (shortEffect && shortEffect.replaceAll('$effect_chance', String(move.effect_chance ?? '')))
      || latestEnglishFlavor(move.flavor_text_entries)
      || MISSING,
    learnedBy: cardsFor(index, move.learned_by_pokemon, (p: { url: string }) => p.url),
  }
})
