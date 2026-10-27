import type { IndexData, IndexEntry } from '#shared/types/pokedex'

// Every species with its default Pokémon's types and its generation, for the list page.
export default defineEventHandler(async (): Promise<IndexData> => {
  const [species, types, generationList] = await Promise.all([fetchList('pokemon-species'), mainTypes(), fetchList('generation')])
  const generations = await mapLimit(generationList, (g) => fetchApi(`generation/${g.name}/`))

  const typesById = new Map<number, { slot: number; name: string }[]>()
  for (const type of types) {
    for (const { slot, pokemon } of type.detail?.pokemon ?? []) {
      const id = idFromUrl(pokemon.url)
      if (id > MAX_SPECIES_ID) continue
      const list = typesById.get(id) ?? []
      list.push({ slot, name: type.name })
      typesById.set(id, list)
    }
  }

  const generationBySpecies = new Map<string, string>()
  for (const generation of generations) {
    for (const s of generation?.pokemon_species ?? []) generationBySpecies.set(s.name, generation.name)
  }

  const entries: IndexEntry[] = species
    .map((s) => {
      const id = idFromUrl(s.url)
      return {
        id,
        name: s.name,
        types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
        generation: generationBySpecies.get(s.name) ?? null,
      }
    })
    .sort((a, b) => a.id - b.id)

  return {
    species: entries,
    types: types.map(({ name, label }) => ({ name, label })),
    generations: generationList.map((g, i) => ({ name: g.name, label: englishName(generations[i]?.names, g.name) })),
  }
})
