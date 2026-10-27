const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

export const statLabel = (name: string) => STAT_LABELS[name] ?? humanize(name)

/** A species and its default Pokémon, looked up by species name. */
export async function getSpeciesAndPokemon(name: string) {
  const species = await apiByName('pokemon-species', name)
  const variety = species.varieties?.find((v: any) => v.is_default)
  const pokemon = await api(`pokemon/${variety ? idFromUrl(variety.pokemon.url) : species.id}`)
  return { species, pokemon }
}

/** Version groups the Pokémon learns moves in, ordered by the version group's `order`. */
export async function getVersionGroups(pokemon: any): Promise<{ name: string; label: string }[]> {
  const urls = new Map<string, string>()
  for (const move of pokemon.moves) {
    for (const d of move.version_group_details) urls.set(d.version_group.name, d.version_group.url)
  }
  const groups = await Promise.all(
    [...urls].map(async ([name, url]) => {
      const group = await api(`version-group/${idFromUrl(url)}`)
      return { name, label: humanize(name), order: group.order as number }
    }),
  )
  return groups.sort((a, b) => a.order - b.order).map(({ name, label }) => ({ name, label }))
}

export function evolutionTree(node: any): EvolutionNode {
  return {
    name: node.species.name,
    label: humanize(node.species.name),
    children: (node.evolves_to ?? []).map(evolutionTree),
  }
}
