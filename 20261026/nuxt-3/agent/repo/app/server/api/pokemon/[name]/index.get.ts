export default defineEventHandler(async (event) => {
  const { species, pokemon } = await getSpeciesAndPokemon(getRouterParam(event, 'name') ?? '')
  const [labels, chain, versionGroups] = await Promise.all([
    getTypeLabels(),
    species.evolution_chain ? api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null,
    getVersionGroups(pokemon),
  ])

  const stats = (pokemon.stats as { base_stat: number; stat: { name: string } }[]).map((s) => ({
    name: s.stat.name,
    label: statLabel(s.stat.name),
    value: s.base_stat,
  }))

  return {
    id: species.id as number,
    name: species.name as string,
    title: englishName(species.names, species.name),
    genus: (species.genera as { genus: string; language: { name: string } }[]).find((g) => g.language.name === 'en')?.genus ?? null,
    types: (pokemon.types as { slot: number; type: { name: string } }[])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => typeRef(t.type.name, labels)),
    artwork: (pokemon.sprites?.other?.['official-artwork']?.front_default as string | null) ?? null,
    height: pokemon.height as number,
    weight: pokemon.weight as number,
    flavorText: latestFlavorText(species.flavor_text_entries),
    stats,
    abilities: (pokemon.abilities as { is_hidden: boolean; slot: number; ability: { name: string } }[])
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    versionGroups,
  }
})
