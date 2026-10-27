export default defineEventHandler(async (event) => {
  const [move, labels] = await Promise.all([
    apiByName('move', getRouterParam(event, 'name') ?? ''),
    getTypeLabels(),
  ])

  return {
    name: move.name,
    title: englishName(move.names, move.name),
    type: typeRef(move.type.name, labels),
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power as number | null,
    accuracy: move.accuracy as number | null,
    pp: move.pp as number | null,
    effect: englishShortEffect(move.effect_entries) ?? latestFlavorText(move.flavor_text_entries),
    learnedBy: await pokemonCards(move.learned_by_pokemon),
  }
})
