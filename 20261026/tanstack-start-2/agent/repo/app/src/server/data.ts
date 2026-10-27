import { collapse, english, humanize, lastEnglish } from '../lib/format'
import type {
  AbilityData,
  Card,
  EvolutionNode,
  HomeData,
  MoveData,
  MoveRow,
  MoveSummary,
  MoveTable,
  Option,
  PokemonData,
  TypeData,
  TypeRef,
} from '../lib/types'
import { NotFoundError, cached, getJson, idFromUrl, listAll, mustGet, spriteUrl, type NamedRef } from './pokeapi'

const PAGE_SIZE = 48
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const MAX_SPECIES_POKEMON_ID = 10000

const englishName = (record: { names?: { name: string; language: { name: string } }[]; name: string }) =>
  english(record.names)?.name ?? humanize(record.name)

// --- Shared indexes -------------------------------------------------------------------

type Species = { id: number; name: string; label: string }

function speciesIndex(): Promise<Map<number, Species>> {
  return cached('index:species', async () => {
    const map = new Map<number, Species>()
    for (const ref of await listAll('pokemon-species')) {
      const id = idFromUrl(ref.url)
      map.set(id, { id, name: ref.name, label: humanize(ref.name) })
    }
    return map
  })
}

// The 18 types, in API order, with their full records.
function typeRecords(): Promise<any[]> {
  return cached('index:types', async () => {
    const refs = (await listAll('type')).filter((t) => !EXCLUDED_TYPES.has(t.name))
    return Promise.all(refs.map((t) => mustGet(`type/${t.name}`)))
  })
}

async function typeLabels(): Promise<Map<string, string>> {
  return new Map((await typeRecords()).map((t) => [t.name, englishName(t)]))
}

async function typeRef(name: string): Promise<TypeRef> {
  return { name, label: (await typeLabels()).get(name) ?? humanize(name) }
}

function generationRecords(): Promise<any[]> {
  return cached('index:generations', async () => {
    const refs = await listAll('generation')
    const records = await Promise.all(refs.map((g) => mustGet(`generation/${g.name}`)))
    return records.sort((a, b) => a.id - b.id)
  })
}

// Cards for Pokémon references, mapped to their species, alternate forms left out.
async function cardsFor<T extends { pokemon: NamedRef }>(
  refs: T[],
  extra: (ref: T) => Partial<Card> = () => ({}),
): Promise<Card[]> {
  const species = await speciesIndex()
  const cards = new Map<number, Card>()
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url)
    if (!(id <= MAX_SPECIES_POKEMON_ID) || cards.has(id)) continue
    const s = species.get(id)
    const name = s?.name ?? ref.pokemon.name
    cards.set(id, { id, name, label: humanize(name), sprite: spriteUrl(id), ...extra(ref) })
  }
  return [...cards.values()].sort((a, b) => a.id - b.id)
}

// --- Home -----------------------------------------------------------------------------

type ListEntry = Species & { types: TypeRef[]; generation: string | null }

function pokemonList(): Promise<ListEntry[]> {
  return cached('index:list', async () => {
    const [species, types, generations] = await Promise.all([speciesIndex(), typeRecords(), generationRecords()])
    const typesById = new Map<number, { slot: number; type: TypeRef }[]>()
    for (const t of types) {
      const ref = { name: t.name, label: englishName(t) }
      for (const p of t.pokemon) {
        const id = idFromUrl(p.pokemon.url)
        if (!typesById.has(id)) typesById.set(id, [])
        typesById.get(id)!.push({ slot: p.slot, type: ref })
      }
    }
    const generationById = new Map<number, string>()
    for (const g of generations) for (const s of g.pokemon_species) generationById.set(idFromUrl(s.url), g.name)
    return [...species.values()]
      .sort((a, b) => a.id - b.id)
      .map((s) => ({
        ...s,
        types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
        generation: generationById.get(s.id) ?? null,
      }))
  })
}

export async function getHome(input: { q?: string; type?: string; generation?: string; page?: number }): Promise<HomeData> {
  const [list, types, generations] = await Promise.all([pokemonList(), typeRecords(), generationRecords()])
  const q = input.q?.trim().toLowerCase()
  const matches = list.filter(
    (p) =>
      (!q || p.label.toLowerCase().includes(q)) &&
      (!input.type || p.types.some((t) => t.name === input.type)) &&
      (!input.generation || p.generation === input.generation),
  )
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(input.page ?? 1)), totalPages)
  return {
    types: types.map((t) => ({ name: t.name, label: englishName(t) })),
    generations: generations.map((g) => ({ name: g.name, label: englishName(g) })),
    count: matches.length,
    page,
    totalPages,
    items: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => ({
      id: p.id,
      name: p.name,
      label: p.label,
      sprite: spriteUrl(p.id),
      types: p.types,
    })),
  }
}

// --- Pokémon --------------------------------------------------------------------------

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

function moveSummary(name: string): Promise<MoveSummary> {
  return cached(`move-summary:${name}`, async () => {
    const m = await mustGet(`move/${name}`)
    return {
      name: m.name,
      label: englishName(m),
      type: await typeRef(m.type.name),
      category: m.damage_class ? humanize(m.damage_class.name) : null,
      power: m.power ?? null,
      accuracy: m.accuracy ?? null,
      pp: m.pp ?? null,
    }
  })
}

function versionGroupOrder(name: string): Promise<number> {
  return cached(`vg-order:${name}`, async () => (await mustGet(`version-group/${name}`)).order as number)
}

function evolutionTree(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(evolutionTree),
  }
}

export async function getPokemon(input: { name: string; game?: string }): Promise<PokemonData> {
  const species = await mustGet(`pokemon-species/${encodeURIComponent(input.name.toLowerCase())}`)
  const variety = species.varieties.find((v: any) => v.is_default) ?? species.varieties[0]
  const pokemonId = variety ? idFromUrl(variety.pokemon.url) : species.id
  const [pokemon, chain] = await Promise.all([
    mustGet(`pokemon/${pokemonId}`),
    species.evolution_chain ? getJson(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null,
  ])

  // Moves: version groups ordered by their `order`, then one table per learn method.
  const groupNames = new Set<string>()
  for (const m of pokemon.moves) for (const d of m.version_group_details) groupNames.add(d.version_group.name)
  const orders = new Map(
    await Promise.all([...groupNames].map(async (g) => [g, await versionGroupOrder(g)] as const)),
  )
  const games = [...groupNames].sort((a, b) => orders.get(a)! - orders.get(b)!).map((name) => ({ name, label: humanize(name) }))
  const game = games.some((g) => g.name === input.game) ? input.game! : (games.at(-1)?.name ?? null)

  const byMethod = new Map<string, { move: string; level: number | null }[]>()
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue
      const method = d.move_learn_method.name
      if (!byMethod.has(method)) byMethod.set(method, [])
      byMethod.get(method)!.push({ move: m.move.name, level: method === 'level-up' ? d.level_learned_at : null })
    }
  }
  const summaries = new Map(
    await Promise.all(
      [...new Set([...byMethod.values()].flat().map((e) => e.move))].map(async (n) => [n, await moveSummary(n)] as const),
    ),
  )
  const rank = (method: string) => {
    const i = METHOD_ORDER.indexOf(method)
    return i === -1 ? METHOD_ORDER.length : i
  }
  const moveTables: MoveTable[] = [...byMethod.entries()]
    .map(([method, entries]) => {
      const rows: MoveRow[] = entries.map((e) => ({ ...summaries.get(e.move)!, level: e.level }))
      rows.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label))
      return { method, label: humanize(method), rows }
    })
    .sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label))

  const flavor = lastEnglish(species.flavor_text_entries as { flavor_text: string; language: { name: string } }[])
  return {
    id: species.id,
    name: species.name,
    label: englishName(species),
    genus: english(species.genera as { genus: string; language: { name: string } }[])?.genus ?? null,
    types: await Promise.all(
      [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => typeRef(t.type.name)),
    ),
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    flavorText: flavor ? collapse(flavor.flavor_text) : null,
    stats: pokemon.stats.map((s: any) => ({ label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name), value: s.base_stat })),
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
    evolution: chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    games,
    game,
    moveTables,
  }
}

// --- Moves, abilities, types ----------------------------------------------------------

export async function getMove(name: string): Promise<MoveData> {
  const m = await mustGet(`move/${encodeURIComponent(name.toLowerCase())}`)
  const shortEffect = english(m.effect_entries as { short_effect: string; language: { name: string } }[])?.short_effect
  const flavor = lastEnglish(m.flavor_text_entries as { flavor_text: string; language: { name: string } }[])?.flavor_text
  return {
    name: m.name,
    label: englishName(m),
    type: await typeRef(m.type.name),
    category: m.damage_class ? humanize(m.damage_class.name) : null,
    power: m.power ?? null,
    accuracy: m.accuracy ?? null,
    pp: m.pp ?? null,
    effect: shortEffect
      ? collapse(shortEffect.replaceAll('$effect_chance', String(m.effect_chance)))
      : flavor
        ? collapse(flavor)
        : null,
    learnedBy: await cardsFor((m.learned_by_pokemon as NamedRef[]).map((pokemon) => ({ pokemon }))),
  }
}

export async function getAbility(name: string): Promise<AbilityData> {
  const a = await mustGet(`ability/${encodeURIComponent(name.toLowerCase())}`)
  const effect = english(a.effect_entries as { short_effect: string; language: { name: string } }[])?.short_effect
  return {
    name: a.name,
    label: englishName(a),
    effect: effect ? collapse(effect) : null,
    pokemon: await cardsFor(a.pokemon as { pokemon: NamedRef; is_hidden: boolean }[], (p) => ({ hidden: p.is_hidden })),
  }
}

export async function getTypes(): Promise<Option[]> {
  return (await typeRecords()).map((t) => ({ name: t.name, label: englishName(t) }))
}

const RELATIONS: [string, string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
]

export async function getType(name: string): Promise<TypeData> {
  const key = name.toLowerCase()
  if (EXCLUDED_TYPES.has(key)) throw new NotFoundError(name)
  const t = await mustGet(`type/${encodeURIComponent(key)}`)
  const relations = await Promise.all(
    RELATIONS.map(async ([field, label]) => ({
      label,
      types: await Promise.all((t.damage_relations[field] as NamedRef[]).map((r) => typeRef(r.name))),
    })),
  )
  return {
    name: t.name,
    label: englishName(t),
    relations,
    pokemon: await cardsFor(t.pokemon as { pokemon: NamedRef }[]),
    moves: (t.moves as NamedRef[])
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }
}
