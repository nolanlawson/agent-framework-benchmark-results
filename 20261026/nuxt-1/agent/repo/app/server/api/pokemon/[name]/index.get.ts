import type { EvolutionNode, PokemonDetail } from '#shared/types'

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
const toNode = (link: ChainLink): EvolutionNode => ({
  name: link.species.name,
  label: humanize(link.species.name),
  children: link.evolves_to.map(toNode),
})

export default defineEventHandler(async (event): Promise<PokemonDetail> => {
  const [{ species, pokemon }, index] = await Promise.all([getSpeciesAndPokemon(getRouterParam(event, 'name')), getIndex()])
  const chain = species.evolution_chain?.url ? await api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null

  return {
    id: species.id,
    name: species.name,
    label: englishName(species.names, species.name),
    genus: english<{ genus: string; language: { name: string } }>(species.genera)?.genus ?? '',
    flavorText: latestEnglishFlavor(species.flavor_text_entries) ?? '',
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    types: [...pokemon.types]
      .sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot)
      .map((t: { type: { name: string } }) => typeRef(index, t.type.name)),
    stats: pokemon.stats.map((s: { base_stat: number; stat: { name: string } }) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...pokemon.abilities]
      .sort((a: { slot: number }, b: { slot: number }) => a.slot - b.slot)
      .map((a: { is_hidden: boolean; ability: { name: string } }) => ({
        name: a.ability.name,
        label: humanize(a.ability.name),
        hidden: a.is_hidden,
      })),
    evolution: chain ? toNode(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
  }
})
