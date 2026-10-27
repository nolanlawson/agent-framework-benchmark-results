const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
] as const

export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') ?? ''
  const types = await getTypes()
  const type = types.find((t) => t.name === name.toLowerCase())
  if (!type) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const labels = new Map(types.map((t) => [t.name, t.label]))
  const { detail } = type

  return {
    name: type.name,
    title: type.label,
    relations: RELATIONS.map(([key, label]) => ({
      label,
      types: (detail.damage_relations[key] as { name: string }[])
        .filter((t) => labels.has(t.name))
        .map((t) => typeRef(t.name, labels)),
    })),
    pokemon: await pokemonCards(detail.pokemon.map((p: { pokemon: { name: string; url: string } }) => p.pokemon)),
    moves: (detail.moves as { name: string }[])
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
})
