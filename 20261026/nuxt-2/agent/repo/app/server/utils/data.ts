import type { Card, TypeRef } from '#shared/types/pokedex'

// Alternate forms (Mega Evolutions etc.) have Pokémon IDs above this.
export const MAX_SPECIES_ID = 10000
const HIDDEN_TYPES = new Set(['stellar', 'unknown', 'shadow'])

interface Named {
  name: string
  language: { name: string }
}

export function englishName(names: Named[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback)
}

export function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function latestFlavorText(entries: { flavor_text: string; language: { name: string } }[] | undefined): string | null {
  const en = entries?.filter((e) => e.language.name === 'en') ?? []
  const last = en[en.length - 1]
  return last ? collapse(last.flavor_text) : null
}

export function shortEffect(entries: { short_effect: string; language: { name: string } }[] | undefined): string | null {
  const entry = entries?.find((e) => e.language.name === 'en')
  return entry ? collapse(entry.short_effect) : null
}

/** Species ID → species name, for every species the API lists. */
export async function speciesNames(): Promise<Map<number, string>> {
  const list = await fetchList('pokemon-species')
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]))
}

export interface TypeInfo extends TypeRef {
  id: number
  detail: any
}

/** Every type the API lists, with details, in API order. */
export async function allTypes(): Promise<TypeInfo[]> {
  const list = await fetchList('type')
  const details = await mapLimit(list, (t) => fetchApi(`type/${t.name}/`))
  return list.map((t, i) => ({
    id: idFromUrl(t.url),
    name: t.name,
    label: englishName(details[i]?.names, t.name),
    detail: details[i],
  }))
}

/** The 18 types. */
export async function mainTypes(): Promise<TypeInfo[]> {
  return (await allTypes()).filter((t) => !HIDDEN_TYPES.has(t.name))
}

export async function typeLabels(): Promise<Map<string, string>> {
  return new Map((await allTypes()).map((t) => [t.name, t.label]))
}

export function typeRef(name: string, labels: Map<string, string>): TypeRef {
  return { name, label: labels.get(name) ?? humanize(name) }
}

/**
 * Turns references to Pokémon into species cards: alternate forms are dropped, and each
 * Pokémon maps to its species (same ID). Sorted by dex number, one card per species.
 */
export async function speciesCards(refs: { pokemon: { name: string; url: string }; hidden?: boolean }[]): Promise<Card[]> {
  const names = await speciesNames()
  const cards = new Map<number, Card>()
  for (const { pokemon, hidden } of refs) {
    const id = idFromUrl(pokemon.url)
    if (!id || id > MAX_SPECIES_ID || cards.has(id)) continue
    const card: Card = { id, name: names.get(id) ?? pokemon.name }
    if (hidden !== undefined) card.hidden = hidden
    cards.set(id, card)
  }
  return [...cards.values()].sort((a, b) => a.id - b.id)
}

/** A species and its default Pokémon, looked up by species name. */
export async function speciesWithPokemon(name: string): Promise<{ species: any; pokemon: any }> {
  const species = await fetchResource('pokemon-species', name)
  const variety = species.varieties?.find((v: { is_default: boolean }) => v.is_default)
  const pokemonId = variety ? idFromUrl(variety.pokemon.url) : species.id
  const pokemon = await fetchApi(`pokemon/${pokemonId}/`)
  if (!pokemon) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return { species, pokemon }
}
