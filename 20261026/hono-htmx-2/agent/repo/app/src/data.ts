// Domain-level data access built on the API client. Everything is fetched at request time
// (through the in-memory cache), so live changes in the API show up in the app.

import { API_BASE_URL, get, must, idFromUrl } from './api.js'
import { collapse, english, humanize, latestEnglish, type NamedRef } from './util.js'

const MAX_SPECIES_ID = 10000
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow'])
const ALL = 'limit=100000'

type List = { count: number; results: NamedRef[] }
type Name = { name: string; language: NamedRef }

export type TypeData = {
  id: number
  name: string
  names: Name[]
  damage_relations: Record<string, NamedRef[]>
  pokemon: { slot: number; pokemon: NamedRef }[]
  moves: NamedRef[]
}

export type GenerationData = { id: number; name: string; names: Name[]; pokemon_species: NamedRef[] }

export type SpeciesData = {
  id: number
  name: string
  names: Name[]
  genera: { genus: string; language: NamedRef }[]
  flavor_text_entries: { flavor_text: string; language: NamedRef }[]
  evolution_chain: { url: string } | null
  varieties: { is_default: boolean; pokemon: NamedRef }[]
}

export type PokemonData = {
  id: number
  name: string
  height: number
  weight: number
  abilities: { is_hidden: boolean; slot: number; ability: NamedRef }[]
  types: { slot: number; type: NamedRef }[]
  stats: { base_stat: number; stat: NamedRef }[]
  sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> }
  moves: {
    move: NamedRef
    version_group_details: { level_learned_at: number; version_group: NamedRef; move_learn_method: NamedRef }[]
  }[]
}

export type ChainLink = { species: NamedRef; evolves_to: ChainLink[] }
export type EvolutionChainData = { id: number; chain: ChainLink }

export type MoveData = {
  id: number
  name: string
  names: Name[]
  accuracy: number | null
  power: number | null
  pp: number | null
  type: NamedRef
  damage_class: NamedRef | null
  effect_entries: { short_effect: string; language: NamedRef }[]
  flavor_text_entries: { flavor_text: string; language: NamedRef }[]
  learned_by_pokemon: NamedRef[]
}

export type AbilityData = {
  id: number
  name: string
  names: Name[]
  effect_entries: { short_effect: string; language: NamedRef }[]
  flavor_text_entries: { flavor_text: string; language: NamedRef }[]
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[]
}

export type VersionGroupData = { id: number; name: string; order: number }

export type Species = { id: number; name: string }

export const englishName = (r: { name: string; names?: Name[] }): string => english(r.names)?.name ?? humanize(r.name)

export const spriteUrl = (pokemonId: number): string => `${API_BASE_URL}/media/sprites/pokemon/${pokemonId}.png`

const enc = (name: string) => encodeURIComponent(name.toLowerCase())

export async function speciesList(): Promise<Species[]> {
  const list = await must<List>(`pokemon-species/?${ALL}`)
  return list.results.map((r) => ({ id: idFromUrl(r.url), name: r.name })).sort((a, b) => a.id - b.id)
}

export async function speciesById(): Promise<Map<number, Species>> {
  return new Map((await speciesList()).map((s) => [s.id, s]))
}

/** The 18 types, in API order. */
export async function allTypes(): Promise<TypeData[]> {
  const list = await must<List>(`type/?${ALL}`)
  return Promise.all(list.results.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => must<TypeData>(t.url)))
}

export async function typeNames(): Promise<Map<string, string>> {
  return new Map((await allTypes()).map((t) => [t.name, englishName(t)]))
}

export async function generations(): Promise<GenerationData[]> {
  const list = await must<List>(`generation/?${ALL}`)
  const gens = await Promise.all(list.results.map((g) => must<GenerationData>(g.url)))
  return gens.sort((a, b) => a.id - b.id)
}

export async function versionGroups(): Promise<VersionGroupData[]> {
  const list = await must<List>(`version-group/?${ALL}`)
  return Promise.all(list.results.map((v) => must<VersionGroupData>(v.url)))
}

export const getType = (name: string) => (EXCLUDED_TYPES.has(name) ? null : get<TypeData>(`type/${enc(name)}`))
export const getMove = (name: string) => get<MoveData>(`move/${enc(name)}`)
export const getAbility = (name: string) => get<AbilityData>(`ability/${enc(name)}`)
export const getSpecies = (name: string) => get<SpeciesData>(`pokemon-species/${enc(name)}`)

/**
 * Maps Pokémon references (as found in type, move and ability data) to species,
 * dropping alternate forms. Sorted by dex number, one entry per species.
 */
export async function speciesForPokemon<T extends { url: string }>(
  refs: T[],
): Promise<{ species: Species; ref: T }[]> {
  const byId = await speciesById()
  const seen = new Set<number>()
  const out: { species: Species; ref: T }[] = []
  for (const ref of refs) {
    const id = idFromUrl(ref.url)
    if (!(id <= MAX_SPECIES_ID) || seen.has(id)) continue
    const species = byId.get(id)
    if (!species) continue
    seen.add(id)
    out.push({ species, ref })
  }
  return out.sort((a, b) => a.species.id - b.species.id)
}

export type IndexEntry = Species & { label: string; types: string[]; generation: string | undefined }

/** Everything the home page filters on, for every species. */
export async function speciesIndex(): Promise<IndexEntry[]> {
  const [species, types, gens] = await Promise.all([speciesList(), allTypes(), generations()])
  const typesById = new Map<number, { slot: number; name: string }[]>()
  for (const type of types) {
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url)
      if (!(id <= MAX_SPECIES_ID)) continue
      const list = typesById.get(id) ?? []
      list.push({ slot, name: type.name })
      typesById.set(id, list)
    }
  }
  const genById = new Map<number, string>()
  for (const gen of gens) for (const s of gen.pokemon_species) genById.set(idFromUrl(s.url), gen.name)
  return species.map((s) => ({
    ...s,
    label: humanize(s.name),
    types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
    generation: genById.get(s.id),
  }))
}

export const flavorText = (r: { flavor_text_entries?: { flavor_text: string; language: NamedRef }[] }) => {
  const entry = latestEnglish(r.flavor_text_entries)
  return entry ? collapse(entry.flavor_text) : undefined
}

export const shortEffect = (r: { effect_entries?: { short_effect: string; language: NamedRef }[] }) => {
  const entry = english(r.effect_entries)
  return entry ? collapse(entry.short_effect) : undefined
}
