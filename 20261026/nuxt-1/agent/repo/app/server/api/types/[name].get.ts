import type { TypeDetail } from '#shared/types'

const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
] as const

export default defineEventHandler(async (event): Promise<TypeDetail> => {
  const name = safeName(getRouterParam(event, 'name'))
  const [type, index] = await Promise.all([apiOrThrow(`type/${name}`), getIndex()])
  if (!index.typeLabels.has(type.name)) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return {
    name: type.name,
    label: englishName(type.names, type.name),
    relations: RELATIONS.map(([key, label]) => ({
      key,
      label,
      types: (type.damage_relations?.[key] ?? []).map((t: { name: string }) => typeRef(index, t.name)),
    })),
    pokemon: cardsFor(index, type.pokemon, (p: { pokemon: { url: string } }) => p.pokemon.url),
    moves: (type.moves as { name: string }[])
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
})
