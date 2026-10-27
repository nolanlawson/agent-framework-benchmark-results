export const MISSING = '—'

export const humanize = (name: string) =>
  name
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`

export const orMissing = (value: number | string | null | undefined) =>
  value === null || value === undefined || value === '' ? MISSING : String(value)

type Localized = { language: { name: string } }

export const english = <T extends Localized>(entries: T[] | undefined): T | undefined =>
  entries?.find((e) => e.language.name === 'en')

export const lastEnglish = <T extends Localized>(entries: T[] | undefined): T | undefined =>
  entries?.findLast((e) => e.language.name === 'en')

export const collapse = (text: string) => text.replace(/\s+/g, ' ').trim()

export const pageTitle = (h1: string) => `${h1} – Pokédex`
