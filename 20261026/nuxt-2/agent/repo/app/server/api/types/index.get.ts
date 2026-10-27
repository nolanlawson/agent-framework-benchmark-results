import type { TypeRef } from '#shared/types/pokedex'

export default defineEventHandler(async (): Promise<TypeRef[]> => {
  return (await mainTypes()).map(({ name, label }) => ({ name, label }))
})
