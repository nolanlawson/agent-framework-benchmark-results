// Server-only: turns API resources into the data each page renders.
import { humanize } from '../lib/format'
import type {
  AbilityData,
  CardData,
  EvolutionNode,
  MoveData,
  MoveRow,
  MoveTable,
  PokemonData,
  PokemonListData,
  TypeData,
  TypeRef,
} from '../lib/types'
import {
  allGenerations,
  allTypes,
  api,
  apiOrNull,
  english,
  englishName,
  frontSprite,
  idFromUrl,
  latestEnglishFlavorText,
  mapLimit,
  MAX_SPECIES_POKEMON_ID,
  safeName,
  speciesList,
  speciesNamesById,
  typeLabels,
  type ApiAbility,
  type ApiChainLink,
  type ApiEvolutionChain,
  type ApiMove,
  type ApiPokemon,
  type ApiSpecies,
  type ApiType,
  type ApiVersionGroup,
  type NamedRef,
} from './pokeapi'

export const PAGE_SIZE = 48

function typeRef(name: string, labels: Map<string, string>): TypeRef {
  return { name, label: labels.get(name) ?? humanize(name) }
}

function card(id: number, speciesName: string): CardData {
  return { id, name: speciesName, label: humanize(speciesName), sprite: frontSprite(id) }
}

/**
 * Cards for a list of Pokémon references: alternate forms left out, each mapped to its
 * species (the default Pokémon shares the species' ID), one card per species, by dex number.
 */
async function cardsForPokemon<T extends { pokemon: NamedRef }>(
  entries: T[],
  extra?: (entry: T) => Partial<CardData>,
): Promise<CardData[]> {
  const names = await speciesNamesById()
  const byId = new Map<number, CardData>()
  for (const entry of entries) {
    const id = idFromUrl(entry.pokemon.url)
    if (!(id > 0 && id < MAX_SPECIES_POKEMON_ID) || byId.has(id)) continue
    const speciesName = names.get(id) ?? entry.pokemon.name
    byId.set(id, { ...card(id, speciesName), ...extra?.(entry) })
  }
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

// ---- Home ----

export async function getPokemonList(input: {
  q?: string
  type?: string
  generation?: string
  page?: number
}): Promise<PokemonListData> {
  const [species, types, generations] = await Promise.all([speciesList(), allTypes(), allGenerations()])

  // species ID → its default Pokémon's types, in slot order
  const typesById = new Map<number, { slot: number; type: TypeRef }[]>()
  for (const t of types) {
    const ref = { name: t.name, label: englishName(t) }
    for (const { slot, pokemon } of t.pokemon) {
      const id = idFromUrl(pokemon.url)
      if (!(id < MAX_SPECIES_POKEMON_ID)) continue
      const list = typesById.get(id) ?? []
      list.push({ slot, type: ref })
      typesById.set(id, list)
    }
  }

  const q = (input.q ?? '').trim().toLowerCase()
  const type = input.type || ''
  const generation = input.generation || ''
  const typeIds = type ? new Set(types.find((t) => t.name === type)?.pokemon.map((p) => idFromUrl(p.pokemon.url)) ?? []) : null
  const genIds = generation
    ? new Set(generations.find((g) => g.name === generation)?.pokemon_species.map((s) => idFromUrl(s.url)) ?? [])
    : null

  const matches = species
    .map((s) => ({ id: idFromUrl(s.url), name: s.name, label: humanize(s.name) }))
    .filter((s) => s.id > 0)
    .filter((s) => !q || s.label.toLowerCase().includes(q))
    .filter((s) => !typeIds || typeIds.has(s.id))
    .filter((s) => !genIds || genIds.has(s.id))
    .sort((a, b) => a.id - b.id)

  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(input.page ?? 1) || 1), pages)
  const items = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
    ...card(s.id, s.name),
    types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
  }))

  return {
    total: matches.length,
    page,
    pages,
    items,
    typeOptions: types.map((t) => ({ value: t.name, label: englishName(t) })),
    generationOptions: generations.map((g) => ({ value: g.name, label: englishName(g) })),
  }
}

// ---- Pokémon ----

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

function evolutionTree(link: ApiChainLink): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    evolvesTo: link.evolves_to.map(evolutionTree),
  }
}

export async function getPokemon(input: { name: string; game?: string }): Promise<PokemonData | null> {
  const name = safeName(input.name)
  if (!name) return null
  const species = await apiOrNull<ApiSpecies>(`pokemon-species/${name}/`)
  if (!species) return null

  const [pokemon, chain, labels] = await Promise.all([
    api<ApiPokemon>(`pokemon/${species.id}/`),
    species.evolution_chain ? apiOrNull<ApiEvolutionChain>(`evolution-chain/${idFromUrl(species.evolution_chain.url)}/`) : null,
    typeLabels(),
  ])

  // Version groups the Pokémon learns moves in, ordered by the version group's `order`.
  const groupNames = new Set<string>()
  for (const m of pokemon.moves) for (const d of m.version_group_details) groupNames.add(d.version_group.name)
  const groups = (
    await Promise.all([...groupNames].map((g) => apiOrNull<ApiVersionGroup>(`version-group/${g}/`)))
  ).filter((g): g is ApiVersionGroup => g !== null)
  groups.sort((a, b) => a.order - b.order || a.id - b.id)
  const game = groups.find((g) => g.name === input.game)?.name ?? groups[groups.length - 1]?.name ?? null

  const moveTables = game ? await movesFor(pokemon, game, labels) : []
  const art = pokemon.sprites.other?.['official-artwork']?.front_default ?? null

  return {
    id: species.id,
    name: species.name,
    label: englishName(species),
    genus: english(species.genera, 'genus') ?? null,
    types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(t.type.name, labels)),
    artwork: art,
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries) ?? null,
    stats: pokemon.stats.map((s) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), evolvesTo: [] },
    games: groups.map((g) => ({ value: g.name, label: humanize(g.name) })),
    game,
    moveTables,
  }
}

async function movesFor(pokemon: ApiPokemon, game: string, labels: Map<string, string>): Promise<MoveTable[]> {
  const entries: { move: NamedRef; method: string; level: number }[] = []
  const seen = new Set<string>()
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue
      const key = `${m.move.name}|${d.move_learn_method.name}|${d.level_learned_at}`
      if (seen.has(key)) continue
      seen.add(key)
      entries.push({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at })
    }
  }

  const uniqueMoves = [...new Map(entries.map((e) => [e.move.name, e.move])).values()]
  const details = new Map<string, ApiMove | null>()
  await mapLimit(uniqueMoves, 16, async (ref) => {
    details.set(ref.name, await apiOrNull<ApiMove>(`move/${idFromUrl(ref.url) || ref.name}/`))
  })

  const byMethod = new Map<string, MoveRow[]>()
  for (const e of entries) {
    const move = details.get(e.move.name)
    const row: MoveRow = {
      name: e.move.name,
      label: move ? englishName(move) : humanize(e.move.name),
      level: e.method === 'level-up' ? e.level : null,
      type: move ? typeRef(move.type.name, labels) : { name: 'unknown', label: '—' },
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    }
    const rows = byMethod.get(e.method) ?? []
    rows.push(row)
    byMethod.set(e.method, rows)
  }

  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method)
    return i === -1 ? METHOD_ORDER.length : i
  }
  return [...byMethod.entries()]
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort(
        (a, b) => (method === 'level-up' ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label),
      ),
    }))
    .sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label))
}

// ---- Moves ----

export async function getMove(input: { name: string }): Promise<MoveData | null> {
  const name = safeName(input.name)
  if (!name) return null
  const move = await apiOrNull<ApiMove>(`move/${name}/`)
  if (!move) return null
  const [labels, learnedBy] = await Promise.all([
    typeLabels(),
    cardsForPokemon(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ])
  return {
    name: move.name,
    label: englishName(move),
    type: typeRef(move.type.name, labels),
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect: english(move.effect_entries, 'short_effect') ?? latestEnglishFlavorText(move.flavor_text_entries) ?? null,
    learnedBy,
  }
}

// ---- Abilities ----

export async function getAbility(input: { name: string }): Promise<AbilityData | null> {
  const name = safeName(input.name)
  if (!name) return null
  const ability = await apiOrNull<ApiAbility>(`ability/${name}/`)
  if (!ability) return null
  return {
    name: ability.name,
    label: englishName(ability),
    effect:
      english(ability.effect_entries, 'short_effect') ?? latestEnglishFlavorText(ability.flavor_text_entries) ?? null,
    pokemon: await cardsForPokemon(ability.pokemon, (e) => ({ hidden: e.is_hidden })),
  }
}

// ---- Types ----

export async function getTypes(): Promise<TypeRef[]> {
  const types = await allTypes()
  return types.map((t) => ({ name: t.name, label: englishName(t) }))
}

const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
] as const

export async function getType(input: { name: string }): Promise<TypeData | null> {
  const name = safeName(input.name)
  if (!name || ['stellar', 'unknown', 'shadow'].includes(name)) return null
  const type = await apiOrNull<ApiType>(`type/${name}/`)
  if (!type) return null
  const [labels, pokemon] = await Promise.all([typeLabels(), cardsForPokemon(type.pokemon)])
  return {
    name: type.name,
    label: englishName(type),
    relations: RELATIONS.map(([key, label]) => ({
      key,
      label,
      types: type.damage_relations[key].map((t) => typeRef(t.name, labels)),
    })),
    pokemon,
    moves: type.moves
      .map((m) => ({ value: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}
