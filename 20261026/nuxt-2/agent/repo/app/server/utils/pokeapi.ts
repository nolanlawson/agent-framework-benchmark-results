// Thin client for the PokeAPI server. Responses are cached in memory for a short time
// (the API is treated as live data), and concurrent requests for the same URL are shared.

const TTL_MS = 60_000
const MAX_CONCURRENCY = 32

interface Entry {
  at: number
  value: Promise<any>
}

const cache = new Map<string, Entry>()

export function apiBase(): string {
  return String(useRuntimeConfig().public.apiBase).replace(/\/+$/, '')
}

/** GET `/api/v2/<path>`; resolves to `null` on 404. */
export function fetchApi<T = any>(path: string): Promise<T | null> {
  const url = `${apiBase()}/api/v2/${path}`
  const now = Date.now()
  const hit = cache.get(url)
  if (hit && now - hit.at < TTL_MS) return hit.value
  const value = fetch(url).then(async (res) => {
    if (res.status === 404) {
      await res.body?.cancel()
      return null
    }
    if (!res.ok) throw new Error(`PokeAPI responded ${res.status} for ${url}`)
    return res.json()
  })
  const entry = { at: now, value }
  cache.set(url, entry)
  value.catch(() => {
    if (cache.get(url) === entry) cache.delete(url)
  })
  return value
}

/** Like fetchApi, but a 404 becomes a 404 error response. */
export async function fetchResource<T = any>(resource: string, key: string): Promise<T> {
  const data = await fetchApi<T>(`${resource}/${encodeURIComponent(key.toLowerCase())}/`)
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return data
}

/** Every entry of a list endpoint. */
export async function fetchList(resource: string): Promise<{ name: string; url: string }[]> {
  const data = await fetchApi<{ results: { name: string; url: string }[] }>(`${resource}/?limit=100000`)
  return data?.results ?? []
}

/** Map with bounded concurrency, preserving order. */
export async function mapLimit<T, R>(items: T[], fn: (item: T) => Promise<R>, limit = MAX_CONCURRENCY): Promise<R[]> {
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

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1])
}
