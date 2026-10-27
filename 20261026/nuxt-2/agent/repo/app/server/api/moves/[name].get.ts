import type { MoveData } from '#shared/types/pokedex'

export default defineEventHandler(async (event): Promise<MoveData> => {
  const move = await fetchResource('move', getRouterParam(event, 'name') ?? '')
  const [labels, pokemon] = await Promise.all([
    typeLabels(),
    speciesCards((move.learned_by_pokemon ?? []).map((p: { name: string; url: string }) => ({ pokemon: p }))),
  ])
  let effect = shortEffect(move.effect_entries)
  if (effect && move.effect_chance != null) effect = effect.replaceAll('$effect_chance', String(move.effect_chance))
  return {
    name: move.name,
    label: englishName(move.names, move.name),
    type: move.type ? typeRef(move.type.name, labels) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: effect ?? latestFlavorText(move.flavor_text_entries),
    pokemon,
  }
})
