const PAGE_SIZE = 48

const one = (value: unknown): string => (Array.isArray(value) ? one(value[0]) : typeof value === 'string' ? value : '')

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = one(query.q).trim().toLowerCase()
  const type = one(query.type)
  const generation = one(query.generation)
  const requestedPage = Number.parseInt(one(query.page), 10) || 1

  const [species, types, generations] = await Promise.all([getSpeciesNames(), getTypes(), getGenerations()])

  // Types of each default Pokémon, in slot order, and the generation of each species.
  const typesById = new Map<number, { slot: number; type: TypeRef }[]>()
  for (const t of types) {
    for (const { slot, pokemon } of t.detail.pokemon as { slot: number; pokemon: { url: string } }[]) {
      const id = idFromUrl(pokemon.url)
      if (!isDefaultPokemonId(id)) continue
      const list = typesById.get(id) ?? []
      list.push({ slot, type: { name: t.name, label: t.label } })
      typesById.set(id, list)
    }
  }
  const generationById = new Map<number, string>()
  for (const g of generations) {
    for (const s of g.detail.pokemon_species as { url: string }[]) generationById.set(idFromUrl(s.url), g.name)
  }

  const all: Card[] = [...species]
    .sort(([a], [b]) => a - b)
    .map(([id, name]) => ({
      ...speciesCard(id, name),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
    }))

  const matches = all.filter(
    (card) =>
      (!q || card.label.toLowerCase().includes(q)) &&
      (!type || card.types!.some((t) => t.name === type)) &&
      (!generation || generationById.get(card.id) === generation),
  )

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), totalPages)

  return {
    types: types.map(({ name, label }) => ({ name, label })),
    generations: generations.map(({ name, label }) => ({ name, label })),
    count: matches.length,
    page,
    totalPages,
    results: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  }
})
