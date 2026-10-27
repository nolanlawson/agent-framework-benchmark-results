// Server-only PokeAPI client. Every piece of data comes from the API over HTTP at request
// time; responses are cached in memory for a short while so that a page needing many
// resources (a Pokémon's move list, the home page index) stays fast.

const CACHE_TTL_MS = 60_000
const MAX_CACHE_ENTRIES = 5_000

export class ApiNotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`)
  }
}

export function apiBaseUrl(): string {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')
}

type Entry = { expires: number; value: Promise<unknown> }
const cache = new Map<string, Entry>()

/** GET `/api/v2/<path>` (path without leading slash), cached. */
export function api<T>(path: string): Promise<T> {
  const url = `${apiBaseUrl()}/api/v2/${path}`
  const now = Date.now()
  const hit = cache.get(url)
  if (hit && hit.expires > now) return hit.value as Promise<T>

  const value = fetchJson<T>(url, path)
  cache.set(url, { expires: now + CACHE_TTL_MS, value })
  // Don't keep failures around.
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url)
  })
  if (cache.size > MAX_CACHE_ENTRIES) {
    for (const [key, entry] of cache) {
      if (entry.expires <= now || cache.size > MAX_CACHE_ENTRIES) cache.delete(key)
      if (cache.size <= MAX_CACHE_ENTRIES * 0.9) break
    }
  }
  return value
}

async function fetchJson<T>(url: string, path: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } })
  if (res.status === 404) {
    await res.body?.cancel()
    throw new ApiNotFoundError(path)
  }
  if (!res.ok) {
    await res.body?.cancel()
    throw new Error(`API request failed (${res.status}): ${url}`)
  }
  return (await res.json()) as T
}

/** Like `api`, but resolves to null when the resource doesn't exist. */
export async function apiOrNull<T>(path: string): Promise<T | null> {
  try {
    return await api<T>(path)
  } catch (err) {
    if (err instanceof ApiNotFoundError) return null
    throw err
  }
}

/** Resource names in URLs come from users: keep them to the characters API names use. */
export function safeName(name: string): string | null {
  const n = name.trim().toLowerCase()
  return /^[a-z0-9-]+$/.test(n) ? n : null
}

// ---- API shapes (only the fields the app uses) ----

export type NamedRef = { name: string; url: string }
export type Localized<K extends string = 'name'> = { language: NamedRef } & Record<K, string>
export type ListResponse = { count: number; results: NamedRef[] }

export type ApiSpecies = {
  id: number
  name: string
  names: Localized[]
  genera: Localized<'genus'>[]
  flavor_text_entries: Localized<'flavor_text'>[]
  evolution_chain: { url: string } | null
  generation: NamedRef
}

export type ApiPokemon = {
  id: number
  name: string
  height: number
  weight: number
  species: NamedRef
  types: { slot: number; type: NamedRef }[]
  abilities: { slot: number; is_hidden: boolean; ability: NamedRef }[]
  stats: { base_stat: number; stat: NamedRef }[]
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> }
  moves: {
    move: NamedRef
    version_group_details: { level_learned_at: number; version_group: NamedRef; move_learn_method: NamedRef }[]
  }[]
}

export type ApiChainLink = { species: NamedRef; evolves_to: ApiChainLink[] }
export type ApiEvolutionChain = { id: number; chain: ApiChainLink }

export type ApiMove = {
  id: number
  name: string
  names: Localized[]
  accuracy: number | null
  power: number | null
  pp: number | null
  type: NamedRef
  damage_class: NamedRef | null
  effect_entries: (Localized<'short_effect'> & { effect: string })[]
  flavor_text_entries: Localized<'flavor_text'>[]
  learned_by_pokemon: NamedRef[]
}

export type ApiAbility = {
  id: number
  name: string
  names: Localized[]
  effect_entries: (Localized<'short_effect'> & { effect: string })[]
  flavor_text_entries: Localized<'flavor_text'>[]
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[]
}

export type ApiType = {
  id: number
  name: string
  names: Localized[]
  damage_relations: Record<
    'double_damage_to' | 'half_damage_to' | 'no_damage_to' | 'double_damage_from' | 'half_damage_from' | 'no_damage_from',
    NamedRef[]
  >
  pokemon: { slot: number; pokemon: NamedRef }[]
  moves: NamedRef[]
}

export type ApiGeneration = { id: number; name: string; names: Localized[]; pokemon_species: NamedRef[] }
export type ApiVersionGroup = { id: number; name: string; order: number }

// ---- Helpers ----

/** Numeric ID at the end of a resource URL. */
export function idFromUrl(url: string): number {
  const m = url.match(/\/(\d+)\/?$/)
  return m ? Number(m[1]) : NaN
}

export function english<K extends string>(entries: Localized<K>[] | undefined, key: K): string | undefined {
  return entries?.find((e) => e.language.name === 'en')?.[key]
}

export function englishName(resource: { names: Localized[]; name: string }): string {
  return english(resource.names, 'name') ?? resource.name
}

export function latestEnglishFlavorText(entries: Localized<'flavor_text'>[] | undefined): string | undefined {
  const en = (entries ?? []).filter((e) => e.language.name === 'en')
  const last = en[en.length - 1]
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : undefined
}

export const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

/** Pokémon IDs above this are alternate forms, which the app leaves out. */
export const MAX_SPECIES_POKEMON_ID = 10000

export function frontSprite(pokemonId: number): string {
  return `${apiBaseUrl()}/media/sprites/pokemon/${pokemonId}.png`
}

export async function speciesList(): Promise<NamedRef[]> {
  const first = await api<ListResponse>('pokemon-species/?limit=100000')
  return first.results
}

/** species ID → species name, for every species the API lists. */
export async function speciesNamesById(): Promise<Map<number, string>> {
  const list = await speciesList()
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]))
}

/** The 18 types, in API order, with their details. */
export async function allTypes(): Promise<ApiType[]> {
  const list = await api<ListResponse>('type/?limit=1000')
  const refs = list.results.filter((t) => !EXCLUDED_TYPES.has(t.name))
  return Promise.all(refs.map((t) => api<ApiType>(`type/${idFromUrl(t.url) || t.name}/`)))
}

/** type API name → English name, for every type the API lists (including excluded ones). */
export async function typeLabels(): Promise<Map<string, string>> {
  const types = await allTypes()
  return new Map(types.map((t) => [t.name, englishName(t)]))
}

export async function allGenerations(): Promise<ApiGeneration[]> {
  const list = await api<ListResponse>('generation/?limit=1000')
  const gens = await Promise.all(list.results.map((g) => api<ApiGeneration>(`generation/${idFromUrl(g.url) || g.name}/`)))
  return gens.sort((a, b) => a.id - b.id)
}

/** Run `fn` over `items` with at most `limit` in flight at once. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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
