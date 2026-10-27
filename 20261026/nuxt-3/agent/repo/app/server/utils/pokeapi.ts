// Access to the PokeAPI server. Responses are cached in memory for a short time so a
// page that needs many records stays fast, while changes in the API still show up.

const CACHE_TTL_MS = 60_000
const CACHE_MAX_ENTRIES = 2_000

interface CacheEntry {
  time: number
  promise: Promise<any>
}

const cache = new Map<string, CacheEntry>()

export function apiBase(): string {
  return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '')
}

class ApiError extends Error {
  constructor(public status: number, url: string) {
    super(`PokeAPI responded with ${status} for ${url}`)
  }
}

async function load(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) {
    await res.body?.cancel()
    throw new ApiError(res.status, url)
  }
  return res.json()
}

/** GET `/api/v2/<path>` and return the parsed JSON. Throws a 404 error for unknown resources. */
export async function api<T = any>(path: string): Promise<T> {
  const url = `${apiBase()}/api/v2/${path.replace(/^\/+/, '')}`
  const now = Date.now()
  const hit = cache.get(url)
  if (hit && now - hit.time < CACHE_TTL_MS) {
    // Refresh recency for LRU eviction.
    cache.delete(url)
    cache.set(url, hit)
    return hit.promise
  }
  const promise = load(url)
  cache.set(url, { time: now, promise })
  if (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!)
  promise.catch(() => {
    if (cache.get(url)?.promise === promise) cache.delete(url)
  })
  try {
    return await promise
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Not found' })
    }
    throw createError({ statusCode: 502, statusMessage: 'The Pokédex data source is unavailable' })
  }
}

/** Fetch a resource by name, rejecting anything that isn't a plain API name. */
export function apiByName<T = any>(resource: string, name: string): Promise<T> {
  if (!/^[a-z0-9-]+$/i.test(name) || /^\d+$/.test(name)) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  return api<T>(`${resource}/${name.toLowerCase()}`)
}

/** Run `fn` over `items` with at most `limit` calls in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1])

interface Named {
  name: string
  language: { name: string }
}

export function englishName(names: Named[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback)
}

/** The last English flavor text entry, with whitespace collapsed. */
export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | null {
  const english = (entries ?? []).filter((e) => e.language.name === 'en')
  const last = english[english.length - 1]
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null
}

export function englishShortEffect(entries: { short_effect: string; language: { name: string } }[] | undefined): string | null {
  return entries?.find((e) => e.language.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() || null
}

const ALTERNATE_FORM_MIN_ID = 10_000
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])

/** The 18 types, in API order, with their English names and full records. */
export async function getTypes(): Promise<{ name: string; label: string; detail: any }[]> {
  const list = await api<{ results: { name: string }[] }>('type?limit=1000')
  const names = list.results.map((t) => t.name).filter((name) => !EXCLUDED_TYPES.has(name))
  return Promise.all(
    names.map(async (name) => {
      const detail = await api(`type/${name}`)
      return { name, label: englishName(detail.names, name), detail }
    }),
  )
}

export async function getTypeLabels(): Promise<Map<string, string>> {
  const types = await getTypes()
  return new Map(types.map((t) => [t.name, t.label]))
}

export function typeRef(name: string, labels: Map<string, string>): TypeRef {
  return { name, label: labels.get(name) ?? humanize(name) }
}

export async function getGenerations(): Promise<{ name: string; label: string; detail: any }[]> {
  const list = await api<{ results: { name: string; url: string }[] }>('generation?limit=1000')
  const generations = await Promise.all(
    list.results.map(async ({ name, url }) => {
      const detail = await api(`generation/${idFromUrl(url)}`)
      return { name, label: englishName(detail.names, name), detail }
    }),
  )
  return generations.sort((a, b) => a.detail.id - b.detail.id)
}

/** Species ID → species name, for every species the API lists. */
export async function getSpeciesNames(): Promise<Map<number, string>> {
  const list = await api<{ results: { name: string; url: string }[] }>('pokemon-species?limit=100000')
  return new Map(list.results.map((s) => [idFromUrl(s.url), s.name]))
}

export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`
}

export function speciesCard(id: number, name: string): Card {
  return { id, name, label: humanize(name), sprite: spriteUrl(id) }
}

/**
 * Cards for a list of Pokémon references (as found in type, move and ability data):
 * alternate forms are dropped and each default Pokémon is shown as its species.
 */
export async function pokemonCards<T extends { name: string; url: string }>(
  refs: T[],
  extra?: (ref: T) => Partial<Card>,
): Promise<Card[]> {
  const species = await getSpeciesNames()
  const seen = new Set<number>()
  const cards: Card[] = []
  for (const ref of refs) {
    const id = idFromUrl(ref.url)
    if (!id || id > ALTERNATE_FORM_MIN_ID || seen.has(id)) continue
    seen.add(id)
    cards.push({ ...speciesCard(id, species.get(id) ?? ref.name), ...extra?.(ref) })
  }
  return cards.sort((a, b) => a.id - b.id)
}

export function isDefaultPokemonId(id: number): boolean {
  return id > 0 && id < ALTERNATE_FORM_MIN_ID
}
