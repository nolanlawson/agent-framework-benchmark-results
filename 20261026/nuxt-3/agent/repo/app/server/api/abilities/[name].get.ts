export default defineEventHandler(async (event) => {
  const ability = await apiByName('ability', getRouterParam(event, 'name') ?? '')
  type Entry = { is_hidden: boolean; pokemon: { name: string; url: string } }
  const entries: Entry[] = ability.pokemon
  const hidden = new Set(entries.filter((e) => e.is_hidden).map((e) => e.pokemon.url))

  return {
    name: ability.name,
    title: englishName(ability.names, ability.name),
    effect: englishShortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries),
    pokemon: await pokemonCards(
      entries.map((e) => e.pokemon),
      (ref) => ({ hidden: hidden.has(ref.url) }),
    ),
  }
})
