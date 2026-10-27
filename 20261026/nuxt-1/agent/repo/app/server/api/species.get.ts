import type { SpeciesPage } from '#shared/types'

const PAGE_SIZE = 48

export default defineEventHandler(async (event): Promise<SpeciesPage> => {
  const query = getQuery(event)
  const q = String(query.q ?? '').trim().toLowerCase()
  const type = String(query.type ?? '')
  const generation = String(query.generation ?? '')
  const index = await getIndex()

  const matches = index.species.filter(
    (s) =>
      (!q || humanize(s.name).toLowerCase().includes(q)) &&
      (!type || (index.typesByPokemon.get(s.id) ?? []).includes(type)) &&
      (!generation || index.generationBySpecies.get(s.id) === generation),
  )
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1), totalPages)
  return {
    count: matches.length,
    page,
    totalPages,
    results: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => card(index, s.id, true)),
  }
})
