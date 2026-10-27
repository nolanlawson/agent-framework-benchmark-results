// Access to the PokeAPI server. Everything is fetched over HTTP at request time and kept in
// a short-lived in-memory cache, so changes to the live data show up within CACHE_TTL_MS.
import type { PokemonCard, TypeRef } from '#shared/types'

const CACHE_TTL_MS = 60_000
const MAX_ENTRIES = 5000
// Alternate forms (Mega Evolutions etc.) have Pokémon IDs above this.
const MAX_DEFAULT_ID = 10000

export function apiBase(): string {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '')
}

interface Entry<T> {
  expires: number
  value: Promise<T>
}
const cache = new Map<string, Entry<unknown>>()

/** Memoize an async computation for CACHE_TTL_MS; concurrent callers share one promise. */
export function memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = cache.get(key) as Entry<T> | undefined
  if (hit && hit.expires > now) return hit.value
  if (cache.size >= MAX_ENTRIES) {
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k)
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!)
  }
  const value = fn()
  cache.set(key, { expires: now + CACHE_TTL_MS, value })
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key)
  })
  return value
}

export class NotFound extends Error {}

/** GET an API path (e.g. `pokemon/25`). Resolves to null on 404. */
export function api<T = any>(path: string): Promise<T | null> {
  return memo(`api:${path}`, () => fetchApi<T>(path))
}

/** Uncached GET, for large records only needed to build a cached summary. */
export async function fetchApi<T = any>(path: string): Promise<T | null> {
  const res = await fetch(`${apiBase()}/api/v2/${path}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`API ${path} responded ${res.status}`)
  return (await res.json()) as T
}

export async function apiOrThrow<T = any>(path: string): Promise<T> {
  const data = await api<T>(path)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return data
}

/** Validates a resource name from a URL before it's used in an API path. */
export function safeName(name: unknown): string {
  const value = String(name ?? '').toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return value
}

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN)

type Named = { name: string; language: { name: string } }
export function english<T extends { language: { name: string } }>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language.name === 'en')
}
export function englishName(entries: Named[] | undefined, fallback: string): string {
  return english(entries)?.name ?? humanize(fallback)
}
export function latestEnglishFlavor(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === 'en')
  const last = en[en.length - 1]
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null
}

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

export interface Index {
  /** All species by dex number. */
  species: { id: number; name: string }[]
  speciesById: Map<number, string>
  /** The 18 types in API order. */
  types: TypeRef[]
  typeLabels: Map<string, string>
  /** Default Pokémon ID → type names in slot order. */
  typesByPokemon: Map<number, string[]>
  generations: TypeRef[]
  generationBySpecies: Map<number, string>
}

/** Cross-resource lookup tables used by the list pages. */
export function getIndex(): Promise<Index> {
  return memo('index', async () => {
    const [speciesList, typeList, generationList] = await Promise.all([
      apiOrThrow('pokemon-species/?limit=100000'),
      apiOrThrow('type/?limit=1000'),
      apiOrThrow('generation/?limit=1000'),
    ])
    const species = (speciesList.results as { name: string; url: string }[])
      .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
      .filter((s) => Number.isFinite(s.id))
      .sort((a, b) => a.id - b.id)

    const typeRefs = (typeList.results as { name: string }[]).filter((t) => !EXCLUDED_TYPES.has(t.name))
    const [typeData, generationData] = await Promise.all([
      Promise.all(typeRefs.map((t) => api(`type/${t.name}`))),
      Promise.all((generationList.results as { name: string }[]).map((g) => api(`generation/${g.name}`))),
    ])

    const types: TypeRef[] = []
    const typeSlots = new Map<number, { slot: number; type: string }[]>()
    for (const [i, t] of typeData.entries()) {
      if (!t) continue
      types.push({ name: t.name, label: englishName(t.names, typeRefs[i]!.name) })
      for (const p of t.pokemon as { slot: number; pokemon: { url: string } }[]) {
        const id = idFromUrl(p.pokemon.url)
        if (!(id <= MAX_DEFAULT_ID)) continue
        const list = typeSlots.get(id) ?? []
        list.push({ slot: p.slot, type: t.name })
        typeSlots.set(id, list)
      }
    }
    const typesByPokemon = new Map<number, string[]>()
    for (const [id, list] of typeSlots) typesByPokemon.set(id, list.sort((a, b) => a.slot - b.slot).map((x) => x.type))

    const generations: TypeRef[] = []
    const generationBySpecies = new Map<number, string>()
    for (const [i, g] of generationData.entries()) {
      if (!g) continue
      generations.push({ name: g.name, label: englishName(g.names, generationList.results[i].name) })
      for (const s of g.pokemon_species as { url: string }[]) generationBySpecies.set(idFromUrl(s.url), g.name)
    }

    return {
      species,
      speciesById: new Map(species.map((s) => [s.id, s.name])),
      types,
      typeLabels: new Map(types.map((t) => [t.name, t.label])),
      typesByPokemon,
      generations,
      generationBySpecies,
    }
  })
}

export function typeRef(index: Index, name: string): TypeRef {
  return { name, label: index.typeLabels.get(name) ?? humanize(name) }
}

export function card(index: Index, id: number, withTypes = false): PokemonCard {
  const name = index.speciesById.get(id) ?? String(id)
  const result: PokemonCard = { id, name, label: humanize(name), sprite: spriteUrl(id) }
  if (withTypes) result.types = (index.typesByPokemon.get(id) ?? []).map((t) => typeRef(index, t))
  return result
}

/**
 * Cards for a list of Pokémon references: alternate forms dropped, mapped to their species
 * (the default Pokémon shares the species' ID), deduplicated and ordered by dex number.
 */
export function cardsFor<T>(index: Index, refs: T[], url: (ref: T) => string, extra?: (ref: T) => Partial<PokemonCard>) {
  const byId = new Map<number, PokemonCard>()
  for (const ref of refs) {
    const id = idFromUrl(url(ref))
    if (!(id <= MAX_DEFAULT_ID) || byId.has(id) || !index.speciesById.has(id)) continue
    byId.set(id, { ...card(index, id), ...extra?.(ref) })
  }
  const results = [...byId.values()].sort((a, b) => a.id - b.id)
  return { count: results.length, results }
}

/** A species and its default Pokémon, looked up by species name. */
export async function getSpeciesAndPokemon(rawName: unknown) {
  const species = await apiOrThrow(`pokemon-species/${safeName(rawName)}`)
  const variety = (species.varieties as { is_default: boolean; pokemon: { url: string } }[]).find((v) => v.is_default)
  const pokemon = await apiOrThrow(`pokemon/${variety ? idFromUrl(variety.pokemon.url) : species.id}`)
  return { species, pokemon }
}
