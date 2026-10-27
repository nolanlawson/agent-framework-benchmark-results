import type { Meta } from '#shared/types'

export default defineEventHandler(async (): Promise<Meta> => {
  const index = await getIndex()
  return { types: index.types, generations: index.generations }
})
