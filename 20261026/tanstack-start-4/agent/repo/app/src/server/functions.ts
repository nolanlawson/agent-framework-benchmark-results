// Server functions: run on the server during SSR and are called over RPC on client navigation.
import { createServerFn } from '@tanstack/react-start'
import { getAbility, getMove, getPokemon, getPokemonList, getType, getTypes } from './data'

export const fetchPokemonList = createServerFn({ method: 'GET' })
  .validator((d: { q?: string; type?: string; generation?: string; page?: number }) => d)
  .handler(({ data }) => getPokemonList(data))

export const fetchPokemon = createServerFn({ method: 'GET' })
  .validator((d: { name: string; game?: string }) => d)
  .handler(({ data }) => getPokemon(data))

export const fetchMove = createServerFn({ method: 'GET' })
  .validator((d: { name: string }) => d)
  .handler(({ data }) => getMove(data))

export const fetchAbility = createServerFn({ method: 'GET' })
  .validator((d: { name: string }) => d)
  .handler(({ data }) => getAbility(data))

export const fetchTypes = createServerFn({ method: 'GET' }).handler(() => getTypes())

export const fetchType = createServerFn({ method: 'GET' })
  .validator((d: { name: string }) => d)
  .handler(({ data }) => getType(data))
