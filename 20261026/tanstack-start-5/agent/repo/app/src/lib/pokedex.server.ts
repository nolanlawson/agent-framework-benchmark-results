// Server-only access to the PokeAPI server. Responses are cached in memory for a short
// time so a page that needs many records doesn't refetch them on every request, while
// changes to the live API still show up quickly.
import { DASH, humanize } from './format'
import type {
  AbilityPage,
  Card,
  EvolutionNode,
  ListPage,
  MovePage,
  MoveRow,
  MoveTable,
  NamedType,
  Option,
  PokemonPage,
  TypePage,
} from './types'

const CACHE_TTL_MS = 60_000
const MAX_FORM_ID = 10_000
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
export const PAGE_SIZE = 48

const apiBase = () => (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')

type Cached = { expires: number; value: Promise<any> }
const cache = new Map<string, Cached>()

// Fetch an API path (e.g. `pokemon/25`), or null on 404.
function get<T = any>(path: string): Promise<T | null> {
  const [resource, query] = path.split('?')
  const key = resource.replace(/^\/+|\/+$/g, '') + (query ? `/?${query}` : '/')
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) return hit.value
  const value = (async () => {
    const res = await fetch(`${apiBase()}/api/v2/${key}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`API ${key} responded with ${res.status}`)
    return res.json()
  })()
  cache.set(key, { expires: now + CACHE_TTL_MS, value })
  value.catch(() => cache.delete(key))
  if (cache.size > 5000) {
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k)
  }
  return value
}

// Turn an absolute or relative API URL into an API path.
const pathOf = (url: string) => url.replace(/^.*\/api\/v2\//, '')
const idOf = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1])
// API names are lowercase ASCII; refuse anything else before it reaches the API.
const validName = (name: string) => /^[a-z0-9-]+$/i.test(name)

type Named = { name: string; language: { name: string } }
const english = (names: Named[] | undefined, fallback: string) =>
  names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback)

function latestFlavorText(entries: any[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language?.name === 'en')
  const last = en[en.length - 1]
  const text = last?.flavor_text ?? last?.text
  return text ? text.replace(/\s+/g, ' ').trim() : null
}

function englishEffect(record: any): string | null {
  const entry = (record.effect_entries ?? []).find((e: any) => e.language?.name === 'en')
  if (!entry?.short_effect) return null
  const chance = record.effect_chance
  const text = chance == null ? entry.short_effect : entry.short_effect.replaceAll('$effect_chance', String(chance))
  return text.replace(/\s+/g, ' ').trim()
}

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`

// ---------------------------------------------------------------------------
// Shared indexes

type Species = { id: number; name: string }

async function speciesList(): Promise<Species[]> {
  const list = await get('pokemon-species?limit=100000')
  return (list?.results ?? [])
    .map((r: any) => ({ id: idOf(r.url), name: r.name }))
    .filter((s: Species) => s.id < MAX_FORM_ID)
    .sort((a: Species, b: Species) => a.id - b.id)
}

type TypeIndex = {
  types: (NamedType & { record: any })[]
  byName: Map<string, NamedType>
  // Default Pokémon ID -> its types in slot order.
  pokemonTypes: Map<number, NamedType[]>
}

async function typeIndex(): Promise<TypeIndex> {
  const list = await get('type?limit=1000')
  const names: string[] = (list?.results ?? []).map((r: any) => r.name).filter((n: string) => !EXCLUDED_TYPES.has(n))
  const records = await Promise.all(names.map((n) => get(`type/${n}`)))
  const types = records
    .filter(Boolean)
    .map((record: any) => ({ name: record.name, label: english(record.names, record.name), record }))
  const byName = new Map(types.map((t) => [t.name, { name: t.name, label: t.label }]))
  const slots = new Map<number, { slot: number; type: NamedType }[]>()
  for (const t of types) {
    for (const p of t.record.pokemon ?? []) {
      const id = idOf(p.pokemon.url)
      if (!slots.has(id)) slots.set(id, [])
      slots.get(id)!.push({ slot: p.slot, type: byName.get(t.name)! })
    }
  }
  const pokemonTypes = new Map<number, NamedType[]>()
  for (const [id, entries] of slots) pokemonTypes.set(id, entries.sort((a, b) => a.slot - b.slot).map((e) => e.type))
  return { types, byName, pokemonTypes }
}

async function generationIndex() {
  const list = await get('generation?limit=1000')
  const records = await Promise.all((list?.results ?? []).map((r: any) => get(`generation/${r.name}`)))
  return records
    .filter(Boolean)
    .sort((a: any, b: any) => a.id - b.id)
    .map((g: any) => ({
      name: g.name as string,
      label: english(g.names, g.name),
      speciesIds: new Set<number>((g.pokemon_species ?? []).map((s: any) => idOf(s.url))),
    }))
}

async function typeLabel(name: string): Promise<NamedType> {
  const index = await typeIndex()
  return index.byName.get(name) ?? { name, label: humanize(name) }
}

// Cards for a list of Pokémon references, mapped to species and without alternate forms.
async function cardsFor(refs: { url: string; hidden?: boolean }[]): Promise<Card[]> {
  const species = await speciesList()
  const byId = new Map(species.map((s) => [s.id, s]))
  const seen = new Map<number, Card>()
  for (const ref of refs) {
    const id = idOf(ref.url)
    if (!(id < MAX_FORM_ID) || seen.has(id)) continue
    const s = byId.get(id)
    if (!s) continue
    seen.set(id, { id, name: s.name, label: humanize(s.name), sprite: spriteUrl(id), ...(ref.hidden ? { hidden: true } : {}) })
  }
  return [...seen.values()].sort((a, b) => a.id - b.id)
}

// ---------------------------------------------------------------------------
// Pages

export async function loadList(filters: { q?: string; type?: string; generation?: string; page?: number }): Promise<ListPage> {
  const [species, types, generations] = await Promise.all([speciesList(), typeIndex(), generationIndex()])
  const q = filters.q?.trim().toLowerCase() ?? ''
  const generation = filters.generation ? generations.find((g) => g.name === filters.generation) : undefined

  const matches = species.filter((s) => {
    if (q && !humanize(s.name).toLowerCase().includes(q)) return false
    if (filters.type && !types.pokemonTypes.get(s.id)?.some((t) => t.name === filters.type)) return false
    if (filters.generation && !generation?.speciesIds.has(s.id)) return false
    return true
  })

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Math.floor(filters.page ?? 1)), pageCount)
  const items: Card[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => ({
    id: s.id,
    name: s.name,
    label: humanize(s.name),
    sprite: spriteUrl(s.id),
    types: types.pokemonTypes.get(s.id) ?? [],
  }))

  return {
    total: matches.length,
    page,
    pageCount,
    items,
    typeOptions: types.types.map((t) => ({ name: t.name, label: t.label })),
    generationOptions: generations.map((g) => ({ name: g.name, label: g.label })),
  }
}

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor']

function chainNode(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    evolvesTo: (link.evolves_to ?? []).map(chainNode),
  }
}

export async function loadPokemon(name: string, game: string | undefined): Promise<PokemonPage | null> {
  if (!validName(name)) return null
  const species = await get(`pokemon-species/${name.toLowerCase()}`)
  if (!species) return null
  const defaultVariety = species.varieties?.find((v: any) => v.is_default)
  const [pokemon, chain] = await Promise.all([
    get(defaultVariety ? pathOf(defaultVariety.pokemon.url) : `pokemon/${species.id}`),
    species.evolution_chain?.url ? get(pathOf(species.evolution_chain.url)) : null,
  ])
  if (!pokemon) return null

  const types = await Promise.all(
    [...(pokemon.types ?? [])].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => typeLabel(t.type.name)),
  )

  // Version groups in which the Pokémon learns moves, ordered by the group's `order`.
  const groupNames = new Set<string>()
  for (const m of pokemon.moves ?? []) for (const d of m.version_group_details ?? []) groupNames.add(d.version_group.name)
  const groups = (await Promise.all([...groupNames].map((g) => get(`version-group/${g}`))))
    .filter(Boolean)
    .sort((a: any, b: any) => a.order - b.order || a.id - b.id)
  const games: Option[] = groups.map((g: any) => ({ name: g.name, label: humanize(g.name) }))
  const selected = games.find((g) => g.name === game)?.name ?? games[games.length - 1]?.name ?? null

  const learned: { move: string; method: string; level: number }[] = []
  for (const m of pokemon.moves ?? []) {
    const seen = new Set<string>()
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== selected) continue
      const key = `${d.move_learn_method.name}:${d.level_learned_at}`
      if (seen.has(key)) continue
      seen.add(key)
      learned.push({ move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at })
    }
  }
  const moveRecords = new Map<string, any>()
  await Promise.all(
    [...new Set(learned.map((l) => l.move))].map(async (m) => moveRecords.set(m, await get(`move/${m}`))),
  )
  const byMethod = new Map<string, MoveRow[]>()
  for (const l of learned) {
    const move = moveRecords.get(l.move)
    if (!move) continue
    const row: MoveRow = {
      level: l.level,
      name: move.name,
      label: english(move.names, move.name),
      type: await typeLabel(move.type.name),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power ?? null,
      accuracy: move.accuracy ?? null,
      pp: move.pp ?? null,
    }
    if (!byMethod.has(l.method)) byMethod.set(l.method, [])
    byMethod.get(l.method)!.push(row)
  }
  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length)
  const moveTables: MoveTable[] = [...byMethod.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || humanize(a).localeCompare(humanize(b)))
    .map(([method, rows]) => ({
      method,
      label: humanize(method),
      rows: rows.sort(
        (a, b) => (method === 'level-up' ? a.level - b.level : 0) || a.label.localeCompare(b.label),
      ),
    }))

  const stats = (pokemon.stats ?? []).map((s: any) => ({ name: s.stat.name, value: s.base_stat }))

  return {
    id: species.id,
    name: species.name,
    label: english(species.names, species.name),
    genus: species.genera?.find((g: any) => g.language.name === 'en')?.genus ?? null,
    types,
    artwork: pokemon.sprites?.other?.['official-artwork']?.front_default ?? pokemon.sprites?.front_default ?? null,
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
    flavorText: latestFlavorText(species.flavor_text_entries),
    stats,
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: Boolean(a.is_hidden) })),
    evolution: chain?.chain ? chainNode(chain.chain) : { name: species.name, label: humanize(species.name), evolvesTo: [] },
    games,
    game: selected,
    moveTables,
  }
}

export async function loadMove(name: string): Promise<MovePage | null> {
  if (!validName(name)) return null
  const move = await get(`move/${name.toLowerCase()}`)
  if (!move) return null
  return {
    name: move.name,
    label: english(move.names, move.name),
    type: move.type ? await typeLabel(move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power ?? null,
    accuracy: move.accuracy ?? null,
    pp: move.pp ?? null,
    effect: englishEffect(move) ?? latestFlavorText(move.flavor_text_entries) ?? DASH,
    learnedBy: await cardsFor((move.learned_by_pokemon ?? []).map((p: any) => ({ url: p.url }))),
  }
}

export async function loadAbility(name: string): Promise<AbilityPage | null> {
  if (!validName(name)) return null
  const ability = await get(`ability/${name.toLowerCase()}`)
  if (!ability) return null
  return {
    name: ability.name,
    label: english(ability.names, ability.name),
    effect: englishEffect(ability) ?? latestFlavorText(ability.flavor_text_entries) ?? DASH,
    pokemon: await cardsFor((ability.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url, hidden: p.is_hidden }))),
  }
}

export async function loadTypes(): Promise<NamedType[]> {
  const index = await typeIndex()
  return index.types.map((t) => ({ name: t.name, label: t.label }))
}

const RELATIONS: [string, string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
]

export async function loadType(name: string): Promise<TypePage | null> {
  if (!validName(name)) return null
  const type = await get(`type/${name.toLowerCase()}`)
  if (!type) return null
  const relations = await Promise.all(
    RELATIONS.map(async ([key, label]) => ({
      label,
      types: await Promise.all((type.damage_relations?.[key] ?? []).map((t: any) => typeLabel(t.name))),
    })),
  )
  return {
    name: type.name,
    label: english(type.names, type.name),
    relations,
    pokemon: await cardsFor((type.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url }))),
    moves: (type.moves ?? [])
      .map((m: any) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a: Option, b: Option) => a.label.localeCompare(b.label)),
  }
}
