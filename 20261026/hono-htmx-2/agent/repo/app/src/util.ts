export type NamedRef = { name: string; url: string }
export type Localized = { language: NamedRef }

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')

export const dexNumber = (id: number): string => `#${String(id).padStart(4, '0')}`

export const english = <T extends Localized>(entries: T[] | undefined): T | undefined =>
  entries?.find((e) => e.language.name === 'en')

export const latestEnglish = <T extends Localized>(entries: T[] | undefined): T | undefined =>
  entries?.findLast((e) => e.language.name === 'en')

export const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim()

export const DASH = '—'

export const orDash = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === '' ? DASH : String(value)

/** Builds `path?query`, leaving out empty values. */
export function withQuery(path: string, params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}
