import { createServerFn } from '@tanstack/react-start'
import {
  getAbilityPage,
  getMovePage,
  getPokemonList,
  getPokemonPage,
  getTypeList,
  getTypePage,
  type ListFilters,
} from './pokeapi'

const asString = (value: unknown) => (typeof value === 'string' ? value : '')

export const fetchPokemonList = createServerFn({ method: 'GET' })
  .validator((input: ListFilters) => input)
  .handler(({ data }) => getPokemonList(data))

export const fetchPokemon = createServerFn({ method: 'GET' })
  .validator((input: { name: string; game?: string }) => ({ name: asString(input.name), game: input.game }))
  .handler(({ data }) => getPokemonPage(data.name, data.game))

export const fetchMove = createServerFn({ method: 'GET' })
  .validator((name: string) => asString(name))
  .handler(({ data }) => getMovePage(data))

export const fetchAbility = createServerFn({ method: 'GET' })
  .validator((name: string) => asString(name))
  .handler(({ data }) => getAbilityPage(data))

export const fetchTypeList = createServerFn({ method: 'GET' }).handler(() => getTypeList())

export const fetchType = createServerFn({ method: 'GET' })
  .validator((name: string) => asString(name))
  .handler(({ data }) => getTypePage(data))
