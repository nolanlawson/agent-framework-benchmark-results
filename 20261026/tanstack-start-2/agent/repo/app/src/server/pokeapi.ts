// Server-side access to the PokeAPI. Everything is fetched over HTTP at request time and
// kept in a short-lived in-memory cache, so the app follows changes to the live data.

const CACHE_TTL_MS = 60_000

export const apiBase = () => (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')

export class NotFoundError extends Error {}

type Entry = { expires: number; value: Promise<unknown> }
const cache = new Map<string, Entry>()

// Memoizes an async computation by key for CACHE_TTL_MS. Failures aren't cached.
export function cached<T>(key: string, compute: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T>
  const value = compute()
  cache.set(key, { expires: now + CACHE_TTL_MS, value })
  value.catch(() => {
    if (cache.get(key)?.value === value) cache.delete(key)
  })
  return value
}

// GET /api/v2/<path>. Resolves to null for a 404.
export function getJson<T = any>(path: string): Promise<T | null> {
  return cached(`json:${path}`, async () => {
    const res = await fetch(`${apiBase()}/api/v2/${path}`)
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`API ${path} responded ${res.status}`)
    return (await res.json()) as T
  })
}

export async function mustGet<T = any>(path: string): Promise<T> {
  const data = await getJson<T>(path)
  if (!data) throw new NotFoundError(path)
  return data
}

export type NamedRef = { name: string; url: string }

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1])

export async function listAll(resource: string): Promise<NamedRef[]> {
  const page = await mustGet<{ results: NamedRef[] }>(`${resource}/?limit=100000&offset=0`)
  return page.results
}

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`
