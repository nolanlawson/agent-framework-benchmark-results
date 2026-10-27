import type { TypeData } from '#shared/types/pokedex'

const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
] as const

export default defineEventHandler(async (event): Promise<TypeData> => {
  const type = await fetchResource('type', getRouterParam(event, 'name') ?? '')
  const [labels, pokemon] = await Promise.all([typeLabels(), speciesCards(type.pokemon ?? [])])
  return {
    name: type.name,
    label: englishName(type.names, type.name),
    relations: RELATIONS.map(([key, label]) => ({
      key,
      label,
      types: (type.damage_relations?.[key] ?? []).map((t: { name: string }) => typeRef(t.name, labels)),
    })),
    pokemon,
    moves: (type.moves ?? [])
      .map((m: { name: string }) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)),
  }
})
