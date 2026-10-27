import { createServerFn } from '@tanstack/react-start'
import { loadAbility, loadList, loadMove, loadPokemon, loadType, loadTypes } from './pokedex.server'

export type ListFilters = { q?: string; type?: string; generation?: string; page?: number }

const nameInput = (data: { name: string }) => ({ name: String(data.name) })

export const getPokemonList = createServerFn({ method: 'GET' })
  .validator((data: ListFilters) => data)
  .handler(({ data }) => loadList(data))

export const getPokemon = createServerFn({ method: 'GET' })
  .validator((data: { name: string; game?: string }) => ({ name: String(data.name), game: data.game }))
  .handler(({ data }) => loadPokemon(data.name, data.game))

export const getMove = createServerFn({ method: 'GET' })
  .validator(nameInput)
  .handler(({ data }) => loadMove(data.name))

export const getAbility = createServerFn({ method: 'GET' })
  .validator(nameInput)
  .handler(({ data }) => loadAbility(data.name))

export const getTypes = createServerFn({ method: 'GET' }).handler(() => loadTypes())

export const getType = createServerFn({ method: 'GET' })
  .validator(nameInput)
  .handler(({ data }) => loadType(data.name))
