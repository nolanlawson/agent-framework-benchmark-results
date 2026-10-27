// Server-side access to the PokeAPI. Everything is fetched over HTTP at request time;
// responses are kept in a short-lived in-memory cache so a page render (and the
// requests that follow it) don't refetch the same resources.
import { humanize, EM_DASH } from '../lib/format'
import type { CardData, EvolutionNode, MoveRow, MoveTable, TypeRef } from '../lib/types'

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const MAX_POKEMON_ID = 10000

// Single resources change rarely but may change at any time; indexes are built from
// many requests, so they are kept a little longer.
const RECORD_TTL = 30_000
const INDEX_TTL = 60_000

export function apiBase(): string {
  return (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/+$/, '')
}

interface CacheEntry {
  expires: number
  value: Promise<unknown>
}
const cache = new Map<string, CacheEntry>()

function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T>
  if (cache.size > 5000) {
    for (const [k, entry] of cache) if (entry.expires <= now) cache.delete(k)
  }
  const value = load()
  const entry = { expires: now + ttl, value }
  cache.set(key, entry)
  value.catch(() => {
    if (cache.get(key) === entry) cache.delete(key)
  })
  return value
}

// Fetches /api/v2/<path>. Resolves to null for 404s.
export function api<T = any>(path: string, ttl = RECORD_TTL): Promise<T | null> {
  return cached(`api:${path}`, ttl, async () => {
    const res = await fetch(`${apiBase()}/api/v2/${path}`)
    if (res.status === 404) {
      await res.body?.cancel()
      return null
    }
    if (!res.ok) throw new Error(`PokeAPI ${path} responded with ${res.status}`)
    return (await res.json()) as T
  })
}

function nameKey(name: string): string {
  return encodeURIComponent(name.toLowerCase())
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN)
}

async function list(resource: string, ttl = INDEX_TTL): Promise<Array<{ name: string; url: string }>> {
  const data = await api<{ results: Array<{ name: string; url: string }> }>(`${resource}/?limit=100000`, ttl)
  return data?.results ?? []
}

// Runs `fn` over `items` with bounded concurrency.
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

type Named = { name: string; language: { name: string } }

export function english<T extends Named>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language.name === 'en')
}

export function latestEnglishFlavor(entries: Array<{ flavor_text: string; language: { name: string } }> | undefined) {
  const en = (entries ?? []).filter((e) => e.language.name === 'en')
  const last = en[en.length - 1]
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null
}

export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`
}

// ---------------------------------------------------------------------------
// Indexes

export interface SpeciesEntry {
  id: number
  name: string
}

export function speciesIndex(): Promise<{ list: SpeciesEntry[]; byId: Map<number, string> }> {
  return cached('index:species', INDEX_TTL, async () => {
    const results = await list('pokemon-species')
    const entries = results.map((r) => ({ id: idFromUrl(r.url), name: r.name })).filter((e) => Number.isFinite(e.id))
    entries.sort((a, b) => a.id - b.id)
    return { list: entries, byId: new Map(entries.map((e) => [e.id, e.name])) }
  })
}

export interface TypeInfo {
  name: string
  label: string
  // pokemon id -> slot
  pokemon: Array<{ id: number; slot: number }>
}

export function typeIndex(): Promise<{ list: TypeInfo[]; byName: Map<string, TypeInfo> }> {
  return cached('index:types', INDEX_TTL, async () => {
    const results = (await list('type')).filter((r) => !EXCLUDED_TYPES.has(r.name))
    const types = await mapLimit(results, 8, async (r) => {
      const data = await api(`type/${nameKey(r.name)}`, INDEX_TTL)
      return {
        name: r.name,
        label: english(data?.names)?.name ?? humanize(r.name),
        pokemon: (data?.pokemon ?? []).map((p: any) => ({ id: idFromUrl(p.pokemon.url), slot: p.slot })),
      }
    })
    return { list: types, byName: new Map(types.map((t) => [t.name, t])) }
  })
}

export async function typeRef(name: string): Promise<TypeRef> {
  const { byName } = await typeIndex()
  return { name, label: byName.get(name)?.label ?? humanize(name) }
}

// pokemon id -> types in slot order
export function pokemonTypes(): Promise<Map<number, TypeRef[]>> {
  return cached('index:pokemon-types', INDEX_TTL, async () => {
    const { list } = await typeIndex()
    const slots = new Map<number, Array<{ slot: number; type: TypeRef }>>()
    for (const t of list) {
      for (const p of t.pokemon) {
        if (!slots.has(p.id)) slots.set(p.id, [])
        slots.get(p.id)!.push({ slot: p.slot, type: { name: t.name, label: t.label } })
      }
    }
    const result = new Map<number, TypeRef[]>()
    for (const [id, entries] of slots) result.set(id, entries.sort((a, b) => a.slot - b.slot).map((e) => e.type))
    return result
  })
}

export interface GenerationInfo {
  name: string
  label: string
  species: Set<number>
}

export function generationIndex(): Promise<GenerationInfo[]> {
  return cached('index:generations', INDEX_TTL, async () => {
    const results = await list('generation')
    const gens = await mapLimit(results, 8, async (r) => {
      const data = await api(`generation/${nameKey(r.name)}`, INDEX_TTL)
      return {
        id: idFromUrl(r.url),
        name: r.name,
        label: english(data?.names)?.name ?? humanize(r.name),
        species: new Set<number>((data?.pokemon_species ?? []).map((s: any) => idFromUrl(s.url))),
      }
    })
    gens.sort((a, b) => a.id - b.id)
    return gens.map(({ id: _id, ...g }) => g)
  })
}

export function versionGroupOrder(): Promise<Map<string, number>> {
  return cached('index:version-groups', INDEX_TTL, async () => {
    const results = await list('version-group')
    const entries = await mapLimit(results, 8, async (r) => {
      const data = await api(`version-group/${nameKey(r.name)}`, INDEX_TTL)
      return [r.name, data?.order ?? idFromUrl(r.url)] as const
    })
    return new Map(entries)
  })
}

// ---------------------------------------------------------------------------
// Cards

// Maps Pokémon references (from types, moves, abilities) to species cards, leaving out
// alternate forms. Ordered by dex number.
export async function cardsForPokemon(
  refs: Array<{ url: string; hidden?: boolean }>,
  withTypes = false,
): Promise<CardData[]> {
  const [{ byId }, types] = await Promise.all([speciesIndex(), withTypes ? pokemonTypes() : null])
  const cards = new Map<number, CardData>()
  for (const ref of refs) {
    const id = idFromUrl(ref.url)
    if (!Number.isFinite(id) || id > MAX_POKEMON_ID || cards.has(id)) continue
    const name = byId.get(id)
    if (!name) continue
    const card: CardData = { id, name, sprite: spriteUrl(id) }
    if (ref.hidden) card.hidden = true
    if (types) card.types = types.get(id) ?? []
    cards.set(id, card)
  }
  return [...cards.values()].sort((a, b) => a.id - b.id)
}

// ---------------------------------------------------------------------------
// Pages

export const PAGE_SIZE = 48

export interface ListFilters {
  q?: string
  type?: string
  generation?: string
  page?: number
}

export async function getPokemonList(filters: ListFilters) {
  const [species, types, generations, pokemonTypeMap] = await Promise.all([
    speciesIndex(),
    typeIndex(),
    generationIndex(),
    pokemonTypes(),
  ])
  const q = filters.q?.trim().toLowerCase() ?? ''
  const typeInfo = filters.type ? types.byName.get(filters.type) : undefined
  const typeIds = typeInfo ? new Set(typeInfo.pokemon.map((p) => p.id)) : null
  const gen = filters.generation ? generations.find((g) => g.name === filters.generation) : undefined

  const matches = species.list.filter((s) => {
    if (q && !humanize(s.name).toLowerCase().includes(q)) return false
    if (filters.type && !typeIds?.has(s.id)) return false
    if (filters.generation && !gen?.species.has(s.id)) return false
    return true
  })

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(filters.page ?? 1) || 1), totalPages)
  const cards: CardData[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
    id: s.id,
    name: s.name,
    sprite: spriteUrl(s.id),
    types: pokemonTypeMap.get(s.id) ?? [],
  }))

  return {
    count: matches.length,
    page,
    totalPages,
    cards,
    typeOptions: types.list.map((t) => ({ name: t.name, label: t.label })),
    generationOptions: generations.map((g) => ({ name: g.name, label: g.label })),
  }
}

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

function buildEvolution(link: any): EvolutionNode {
  return {
    name: link.species.name,
    children: (link.evolves_to ?? []).map(buildEvolution),
  }
}

async function moveSummary(name: string) {
  return cached(`move-summary:${name}`, RECORD_TTL, async () => {
    const move = await api(`move/${nameKey(name)}`)
    if (!move) return null
    return {
      label: english(move.names)?.name ?? humanize(name),
      type: move.type ? await typeRef(move.type.name) : null,
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    }
  })
}

export async function getPokemonPage(name: string, game?: string) {
  const species = await api(`pokemon-species/${nameKey(name)}`)
  if (!species) return null
  const defaultVariety = species.varieties?.find((v: any) => v.is_default)
  const pokemonId = defaultVariety ? idFromUrl(defaultVariety.pokemon.url) : species.id
  const [pokemon, chain, vgOrder] = await Promise.all([
    api(`pokemon/${pokemonId}`),
    species.evolution_chain?.url ? api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null,
    versionGroupOrder(),
  ])
  if (!pokemon) return null

  const label = english(species.names)?.name ?? humanize(species.name)

  // Version groups in which the Pokémon learns moves.
  const groups = new Set<string>()
  for (const m of pokemon.moves ?? []) for (const d of m.version_group_details) groups.add(d.version_group.name)
  const games = [...groups]
    .sort((a, b) => (vgOrder.get(a) ?? 0) - (vgOrder.get(b) ?? 0) || a.localeCompare(b))
    .map((g) => ({ name: g, label: humanize(g) }))
  const selectedGame = game && groups.has(game) ? game : games[games.length - 1]?.name ?? null

  const byMethod = new Map<string, Array<{ move: string; level: number }>>()
  if (selectedGame) {
    for (const m of pokemon.moves ?? []) {
      for (const d of m.version_group_details) {
        if (d.version_group.name !== selectedGame) continue
        const method = d.move_learn_method.name
        if (!byMethod.has(method)) byMethod.set(method, [])
        byMethod.get(method)!.push({ move: m.move.name, level: d.level_learned_at })
      }
    }
  }
  const moveNames = [...new Set([...byMethod.values()].flat().map((e) => e.move))]
  const summaries = new Map(
    await mapLimit(moveNames, 16, async (n) => [n, await moveSummary(n)] as const),
  )

  const methods = [...byMethod.keys()].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a)
    const ib = METHOD_ORDER.indexOf(b)
    if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib)
    return humanize(a).localeCompare(humanize(b))
  })
  const moveTables: MoveTable[] = methods.map((method) => {
    const rows: MoveRow[] = byMethod.get(method)!.map(({ move, level }) => {
      const s = summaries.get(move)
      const row: MoveRow = {
        name: move,
        label: s?.label ?? humanize(move),
        type: s?.type ?? null,
        category: s?.category ?? null,
        power: s?.power ?? null,
        accuracy: s?.accuracy ?? null,
        pp: s?.pp ?? null,
      }
      if (method === 'level-up') row.level = level
      return row
    })
    // A move can be listed more than once (e.g. at several levels); keep each entry.
    return { method, label: humanize(method), rows }
  })

  const stats: Array<{ name: string; label: string; value: number }> = (pokemon.stats ?? []).map((s: any) => ({
    name: s.stat.name as string,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }))

  const types: TypeRef[] = await Promise.all(
    [...(pokemon.types ?? [])].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => typeRef(t.type.name)),
  )

  return {
    id: species.id as number,
    name: species.name as string,
    label,
    genus: english<any>(species.genera)?.genus ?? null,
    types,
    artwork:
      pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: ((pokemon.height ?? 0) / 10).toFixed(1),
    weight: ((pokemon.weight ?? 0) / 10).toFixed(1),
    flavor: latestEnglishFlavor(species.flavor_text_entries),
    stats,
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name as string, hidden: Boolean(a.is_hidden) })),
    evolution: chain?.chain ? buildEvolution(chain.chain) : { name: species.name, children: [] },
    games,
    selectedGame,
    moveTables,
  }
}

export async function getMovePage(name: string) {
  const move = await api(`move/${nameKey(name)}`)
  if (!move) return null
  let effect: string | null = english<any>(move.effect_entries)?.short_effect ?? null
  if (effect && move.effect_chance != null) effect = effect.replaceAll('$effect_chance', String(move.effect_chance))
  if (!effect) effect = latestEnglishFlavor(move.flavor_text_entries)
  const learnedBy = await cardsForPokemon(move.learned_by_pokemon ?? [])
  return {
    name: move.name as string,
    label: english(move.names)?.name ?? humanize(move.name),
    type: move.type ? await typeRef(move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: effect ?? EM_DASH,
    learnedBy,
  }
}

export async function getAbilityPage(name: string) {
  const ability = await api(`ability/${nameKey(name)}`)
  if (!ability) return null
  let effect: string | null = english<any>(ability.effect_entries)?.short_effect ?? null
  if (!effect) effect = latestEnglishFlavor(ability.flavor_text_entries)
  const pokemon = await cardsForPokemon(
    (ability.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url, hidden: p.is_hidden })),
  )
  return {
    name: ability.name as string,
    label: english(ability.names)?.name ?? humanize(ability.name),
    effect: effect ?? EM_DASH,
    pokemon,
  }
}

export async function getTypeList() {
  const { list } = await typeIndex()
  return list.map((t) => ({ name: t.name, label: t.label }))
}

const RELATIONS = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
] as const

export async function getTypePage(name: string) {
  if (EXCLUDED_TYPES.has(name.toLowerCase())) return null
  const type = await api(`type/${nameKey(name)}`)
  if (!type) return null
  const relations = await Promise.all(
    RELATIONS.map(async ([key, label]) => ({
      label,
      types: await Promise.all(
        (type.damage_relations?.[key] ?? []).map((t: any) => typeRef(t.name)),
      ),
    })),
  )
  const pokemon = await cardsForPokemon((type.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url })))
  const moves: Array<{ name: string; label: string }> = (type.moves ?? [])
    .map((m: any) => ({ name: m.name as string, label: humanize(m.name) }))
    .sort((a: any, b: any) => a.label.localeCompare(b.label))
  return {
    name: type.name as string,
    label: english(type.names)?.name ?? humanize(type.name),
    relations,
    pokemon,
    moves,
  }
}
