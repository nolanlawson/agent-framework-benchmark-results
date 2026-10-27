import type { EvolutionNode, PokemonData } from '#shared/types/pokedex'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

interface ChainLink {
  species: { name: string }
  evolves_to: ChainLink[]
}

function toNode(link: ChainLink): EvolutionNode {
  return { name: link.species.name, children: (link.evolves_to ?? []).map(toNode) }
}

export default defineEventHandler(async (event): Promise<PokemonData> => {
  const { species, pokemon } = await speciesWithPokemon(getRouterParam(event, 'name') ?? '')
  const [labels, chain] = await Promise.all([
    typeLabels(),
    species.evolution_chain?.url ? fetchApi(`evolution-chain/${idFromUrl(species.evolution_chain.url)}/`) : null,
  ])
  const label = englishName(species.names, species.name)
  const sprites = pokemon.sprites ?? {}

  return {
    id: species.id,
    name: species.name,
    label,
    genus: species.genera?.find((g: { language: { name: string } }) => g.language.name === 'en')?.genus ?? null,
    types: [...(pokemon.types ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((t: { type: { name: string } }) => typeRef(t.type.name, labels)),
    artwork: sprites.other?.['official-artwork']?.front_default ?? sprites.front_default ?? null,
    height: pokemon.height,
    weight: pokemon.weight,
    flavor: latestFlavorText(species.flavor_text_entries),
    stats: (pokemon.stats ?? []).map((s: { base_stat: number; stat: { name: string } }) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a, b) => a.slot - b.slot)
      .map((a: { ability: { name: string }; is_hidden: boolean }) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: chain?.chain ? toNode(chain.chain) : { name: species.name, children: [] },
  }
})
