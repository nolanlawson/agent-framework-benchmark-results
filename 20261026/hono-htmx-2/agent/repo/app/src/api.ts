// Thin PokeAPI client with an in-memory stale-while-revalidate cache.

export const API_BASE_URL = (process.env.API_BASE_URL ?? 'http://localhost:9000').replace(/\/$/, '')

const FRESH_MS = 60_000

type Entry = { value: unknown; fetchedAt: number; pending?: Promise<unknown> }
const cache = new Map<string, Entry>()

class ApiError extends Error {}

// Accepts an API path (`pokemon/25`) or an absolute API URL as found in responses.
function toUrl(pathOrUrl: string): string {
  const path = pathOrUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\/?(api\/v2\/)?/, '')
  return `${API_BASE_URL}/api/v2/${path.replace(/\/?(\?|$)/, '/$1')}`
}

async function load(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (res.status === 404) {
    await res.body?.cancel()
    return null
  }
  if (!res.ok) {
    await res.body?.cancel()
    throw new ApiError(`API request failed: ${res.status} ${url}`)
  }
  return res.json()
}

function refresh(url: string, entry: Entry | undefined): Promise<unknown> {
  if (entry?.pending) return entry.pending
  const pending = load(url).then(
    (value) => {
      cache.set(url, { value, fetchedAt: Date.now() })
      return value
    },
    (err) => {
      const current = cache.get(url)
      if (current) delete current.pending
      else cache.delete(url)
      throw err
    },
  )
  if (entry) entry.pending = pending
  else cache.set(url, { value: undefined, fetchedAt: 0, pending })
  return pending
}

/** Fetches a resource; resolves to `null` when the API responds 404. */
export async function get<T>(pathOrUrl: string): Promise<T | null> {
  const url = toUrl(pathOrUrl)
  const entry = cache.get(url)
  if (entry && entry.fetchedAt > 0) {
    if (Date.now() - entry.fetchedAt > FRESH_MS) refresh(url, entry).catch(() => {})
    return entry.value as T | null
  }
  return refresh(url, entry) as Promise<T | null>
}

/** Like `get`, but a missing resource is an error. */
export async function must<T>(pathOrUrl: string): Promise<T> {
  const value = await get<T>(pathOrUrl)
  if (value === null) throw new ApiError(`API resource not found: ${pathOrUrl}`)
  return value
}

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN)
