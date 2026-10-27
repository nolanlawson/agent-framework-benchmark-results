import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import * as data from '../server/data'
import { NotFoundError } from '../server/pokeapi'

async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (err) {
    if (err instanceof NotFoundError) throw notFound()
    throw err
  }
}

const str = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

export const fetchHome = createServerFn({ method: 'GET' })
  .validator((d: { q?: string; type?: string; generation?: string; page?: number }) => ({
    q: str(d.q),
    type: str(d.type),
    generation: str(d.generation),
    page: typeof d.page === 'number' ? d.page : undefined,
  }))
  .handler(({ data: input }) => data.getHome(input))

export const fetchPokemon = createServerFn({ method: 'GET' })
  .validator((d: { name: string; game?: string }) => ({ name: String(d.name), game: str(d.game) }))
  .handler(({ data: input }) => orNotFound(data.getPokemon(input)))

export const fetchMove = createServerFn({ method: 'GET' })
  .validator((name: string) => String(name))
  .handler(({ data: name }) => orNotFound(data.getMove(name)))

export const fetchAbility = createServerFn({ method: 'GET' })
  .validator((name: string) => String(name))
  .handler(({ data: name }) => orNotFound(data.getAbility(name)))

export const fetchTypes = createServerFn({ method: 'GET' }).handler(() => data.getTypes())

export const fetchType = createServerFn({ method: 'GET' })
  .validator((name: string) => String(name))
  .handler(({ data: name }) => orNotFound(data.getType(name)))
